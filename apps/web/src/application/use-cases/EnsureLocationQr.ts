import { QrToken } from '@/domain/entities/QrToken'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import { LocationNotFoundError } from '@/domain/errors/LocationNotFoundError'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { LocationRepository } from '@/domain/repositories/LocationRepository'
import type { QrTokenRepository } from '@/domain/repositories/QrTokenRepository'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import {
  QrTokenValue,
  type BusinessId,
  type LocationId,
} from '@/domain/value-objects/ids'

export interface EnsureLocationQrInput {
  businessId: BusinessId
  locationId: LocationId
}

export interface EnsureLocationQrResult {
  qrToken: QrToken
  /** `true` cuando se generó uno nuevo, `false` cuando se reusó el activo. */
  generated: boolean
}

// Alineado con el default `now() + interval '24 hours'` de la tabla
// qr_tokens (ARCHITECTURE §6). Mismo TTL que GenerateQr.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Devuelve el QR activo de una sede (el último no usado y no expirado)
 * o genera uno nuevo si no hay. Implementa RF-17: la pantalla del gym
 * polleará este use case; mientras nadie escanee, recibe el mismo
 * token (estable); tras un escaneo el latest-active desaparece y el
 * use case genera uno fresco, que la pantalla muestra en su siguiente
 * tick. La generación explícita (botón manual "Generar nuevo QR")
 * sigue siendo `GenerateQrUseCase`.
 */
export class EnsureLocationQrUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly locations: LocationRepository,
    private readonly qrTokens: QrTokenRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    input: EnsureLocationQrInput,
  ): Promise<EnsureLocationQrResult> {
    const now = this.clock.now()

    // Fast path: si ya hay un QR activo de la sede, lo reusamos. No
    // validamos business/location porque el token solo pudo crearse si
    // ambos existían entonces (el FK garantiza la consistencia). Esto
    // recorta el polling estable a una sola query.
    const existing = await this.qrTokens.findLatestActiveByLocation(
      input.businessId,
      input.locationId,
      now,
    )
    if (existing) return { qrToken: existing, generated: false }

    // Slow path (raro: tras un escaneo, o primer arranque): validamos
    // antes de generar para no insertar un QR contra un business/location
    // inexistente (los FK lanzarían un 500 menos descriptivo).
    const business = await this.businesses.findById(
      input.businessId,
      input.businessId,
    )
    if (!business) throw new BusinessNotFoundError(input.businessId)

    const location = await this.locations.findById(
      input.locationId,
      input.businessId,
    )
    if (!location) throw new LocationNotFoundError(input.locationId)

    const qrToken = new QrToken({
      token: QrTokenValue(this.ids.uuid()),
      businessId: input.businessId,
      locationId: input.locationId,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
      usedBy: null,
      usedAt: null,
    })
    await this.qrTokens.save(qrToken, input.businessId)
    return { qrToken, generated: true }
  }
}
