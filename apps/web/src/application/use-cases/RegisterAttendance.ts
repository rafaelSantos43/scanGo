import { Attendance } from '@/domain/entities/Attendance'
import type { Package } from '@/domain/entities/Package'
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
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import {
  AttendanceId,
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
}

export class RegisterAttendanceUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly customers: CustomerRepository,
    private readonly packages: PackageRepository,
    private readonly attendances: AttendanceRepository,
    private readonly qrTokens: QrTokenRepository,
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

    const scannedDate = formatDateInTimezone(now, business.timezone)

    const attendance = new Attendance({
      id: AttendanceId(this.ids.uuid()),
      customerId: input.customerId,
      businessId: input.businessId,
      packageId: updatedPackage.id,
      qrToken: qrToken.token,
      scannedAt: now,
      scannedDate,
    })
    await this.attendances.save(attendance, input.businessId)

    // TODO(outbox): cuando WebhookDeliveryRepository exista, insertar fila
    // pending para 'attendance.created' (y 'package.depleted' si
    // updatedPackage.status === 'depleted') dentro de esta misma
    // transaccion. Ver ENGRAM D-006 y ARCHITECTURE §9.1 caso 4.

    return {
      attendance,
      package: updatedPackage,
      remainingVisits: updatedPackage.remainingVisits.value,
    }
  }
}
