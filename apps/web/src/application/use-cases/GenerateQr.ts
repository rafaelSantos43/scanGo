import { QrToken } from '@/domain/entities/QrToken'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { QrTokenRepository } from '@/domain/repositories/QrTokenRepository'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import { QrTokenValue, type BusinessId } from '@/domain/value-objects/ids'

export interface GenerateQrInput {
  businessId: BusinessId
}

export interface GenerateQrResult {
  qrToken: QrToken
}

// TTL en aplicacion alineado con el default `now() + interval '24 hours'` de
// la tabla qr_tokens (ARCHITECTURE §6). Si se cambia uno, cambiar el otro.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export class GenerateQrUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly qrTokens: QrTokenRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: GenerateQrInput): Promise<GenerateQrResult> {
    const business = await this.businesses.findById(
      input.businessId,
      input.businessId,
    )
    if (!business) throw new BusinessNotFoundError(input.businessId)

    const now = this.clock.now()
    const qrToken = new QrToken({
      token: QrTokenValue(this.ids.uuid()),
      businessId: input.businessId,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
      usedBy: null,
      usedAt: null,
    })
    await this.qrTokens.save(qrToken, input.businessId)
    return { qrToken }
  }
}
