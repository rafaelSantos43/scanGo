import { Attendance } from '@/domain/entities/Attendance'
import type { Package } from '@/domain/entities/Package'
import { WebhookDelivery } from '@/domain/entities/WebhookDelivery'
import type { WebhookEventType } from '@/domain/events/WebhookEvent'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import { CustomerDisabledError } from '@/domain/errors/CustomerDisabledError'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import { NoActivePackageError } from '@/domain/errors/NoActivePackageError'
import { PackageDepletedError } from '@/domain/errors/PackageDepletedError'
import { QrTokenAlreadyUsedError } from '@/domain/errors/QrTokenAlreadyUsedError'
import { QrTokenExpiredError } from '@/domain/errors/QrTokenExpiredError'
import { QrTokenNotFoundError } from '@/domain/errors/QrTokenNotFoundError'
import type { AttendanceRepository } from '@/domain/repositories/AttendanceRepository'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { PackageRepository } from '@/domain/repositories/PackageRepository'
import type { QrTokenRepository } from '@/domain/repositories/QrTokenRepository'
import type { WebhookDeliveryRepository } from '@/domain/repositories/WebhookDeliveryRepository'
import type { WebhookSubscriptionRepository } from '@/domain/repositories/WebhookSubscriptionRepository'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import {
  AttendanceId,
  WebhookDeliveryId,
  type BusinessId,
  type CustomerId,
  type QrTokenValue,
} from '@/domain/value-objects/ids'
import { formatDateInTimezone } from './_lib/formatDateInTimezone'

export interface RegisterAttendanceInput {
  customerId: CustomerId
  businessId: BusinessId
  qrToken: QrTokenValue
}

export interface RegisterAttendanceResult {
  attendance: Attendance
  package: Package
  remainingVisits: number
  /**
   * `true` cuando el cliente ya tenia una asistencia de hoy y esta se
   * retorna por idempotencia (§9.2) sin consumir una visita nueva.
   * `false` cuando es un registro fresco. Permite a la UI distinguir
   * "visita registrada" de "ya registraste tu visita de hoy".
   */
  alreadyRegistered: boolean
}

export class RegisterAttendanceUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly customers: CustomerRepository,
    private readonly packages: PackageRepository,
    private readonly attendances: AttendanceRepository,
    private readonly qrTokens: QrTokenRepository,
    private readonly webhookSubscriptions: WebhookSubscriptionRepository,
    private readonly webhookDeliveries: WebhookDeliveryRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    input: RegisterAttendanceInput,
  ): Promise<RegisterAttendanceResult> {
    const now = this.clock.now()

    const business = await this.businesses.findById(
      input.businessId,
      input.businessId,
    )
    if (!business) throw new BusinessNotFoundError(input.businessId)

    const scannedDate = formatDateInTimezone(now, business.timezone)

    // Idempotencia §9.2: si el cliente ya marco hoy, retornamos esa
    // asistencia sin tocar QR ni paquete. Cubre el reintento de tap
    // accidental o de red sin consumir un QR adicional ni descontar
    // visitas. La carrera (dos requests concurrentes pasando este
    // check) sigue cayendo en el constraint UNIQUE de attendances al
    // hacer save y propaga AlreadyScannedTodayError (409).
    const existing = await this.attendances.findByCustomerAndDate(
      input.customerId,
      input.businessId,
      scannedDate,
    )
    if (existing) {
      const pkg = await this.packages.findById(
        existing.packageId,
        input.businessId,
      )
      if (!pkg) {
        throw new Error(
          `Inconsistent state: attendance ${existing.id} references missing package ${existing.packageId}`,
        )
      }
      return {
        attendance: existing,
        package: pkg,
        remainingVisits: pkg.remainingVisits.value,
        alreadyRegistered: true,
      }
    }

    const customer = await this.customers.findById(
      input.customerId,
      input.businessId,
    )
    if (!customer) throw new CustomerNotFoundError(input.customerId)
    if (!customer.isActive()) throw new CustomerDisabledError(input.customerId)

    const qrToken = await this.qrTokens.claim(
      input.qrToken,
      input.businessId,
      input.customerId,
      now,
    )
    if (!qrToken) {
      // claim() devuelve null tanto si ya fue usado como si esta expirado.
      // Una lectura adicional distingue ambos casos para mapear al error
      // correcto del dominio.
      const fresh = await this.qrTokens.findByToken(
        input.qrToken,
        input.businessId,
      )
      if (!fresh) throw new QrTokenNotFoundError()
      if (fresh.isExpired(now)) throw new QrTokenExpiredError()
      throw new QrTokenAlreadyUsedError()
    }

    const activePackage = await this.packages.findActiveByCustomerId(
      input.customerId,
      input.businessId,
    )
    if (!activePackage) throw new NoActivePackageError(input.customerId)

    const updatedPackage = await this.packages.decrementVisitAtomic(
      activePackage.id,
      input.businessId,
    )
    if (!updatedPackage) throw new PackageDepletedError(activePackage.id)

    const attendance = new Attendance({
      id: AttendanceId(this.ids.uuid()),
      customerId: input.customerId,
      businessId: input.businessId,
      // La sede sale del QR reclamado, no del request: el cliente no
      // elige donde marca: la pantalla que escaneo determina la sede.
      locationId: qrToken.locationId,
      packageId: updatedPackage.id,
      qrToken: qrToken.token,
      scannedAt: now,
      scannedDate,
    })
    await this.attendances.save(attendance, input.businessId)

    // Outbox (ARCHITECTURE §9.1 caso 4): se encolan las entregas dentro de
    // la misma transaccion del escaneo. El cron DeliverWebhook las despacha.
    await this.enqueueWebhooks(attendance, updatedPackage, now)

    return {
      attendance,
      package: updatedPackage,
      remainingVisits: updatedPackage.remainingVisits.value,
      alreadyRegistered: false,
    }
  }

  /**
   * Inserta filas `pending` en webhook_deliveries por cada par
   * (evento, suscripcion suscrita a ese evento). Sin suscripciones
   * activas no hace nada. La idempotencia (early return de arriba) NO
   * pasa por aqui: los webhooks se encolan solo en el escaneo fresco.
   */
  private async enqueueWebhooks(
    attendance: Attendance,
    pkg: Package,
    now: Date,
  ): Promise<void> {
    const subscriptions = await this.webhookSubscriptions.findActiveByBusinessId(
      attendance.businessId,
    )
    if (subscriptions.length === 0) return

    const events: Array<{ type: WebhookEventType; data: Record<string, unknown> }> =
      [
        {
          type: 'attendance.created',
          data: {
            attendance_id: attendance.id,
            customer_id: attendance.customerId,
            business_id: attendance.businessId,
            location_id: attendance.locationId,
            package_id: pkg.id,
            remaining_visits: pkg.remainingVisits.value,
            scanned_at: attendance.scannedAt.toISOString(),
          },
        },
      ]
    if (pkg.status === 'depleted') {
      events.push({
        type: 'package.depleted',
        data: {
          package_id: pkg.id,
          customer_id: pkg.customerId,
          business_id: pkg.businessId,
          total_visits: pkg.totalVisits.value,
          remaining_visits: pkg.remainingVisits.value,
          depleted_at: attendance.scannedAt.toISOString(),
        },
      })
    }

    for (const event of events) {
      const payload = {
        id: this.ids.uuid(),
        type: event.type,
        created_at: now.toISOString(),
        data: event.data,
      }
      for (const subscription of subscriptions) {
        if (!subscription.isSubscribedTo(event.type)) continue
        const delivery = WebhookDelivery.pending({
          id: WebhookDeliveryId(this.ids.uuid()),
          subscriptionId: subscription.id,
          businessId: attendance.businessId,
          eventType: event.type,
          payload,
          now,
        })
        await this.webhookDeliveries.save(delivery, attendance.businessId)
      }
    }
  }
}
