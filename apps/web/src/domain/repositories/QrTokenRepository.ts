import type { QrToken } from '../entities/QrToken'
import type { BusinessId, QrTokenValue } from '../value-objects/ids'

export interface QrTokenRepository {
  findByToken(
    token: QrTokenValue,
    businessId: BusinessId,
  ): Promise<QrToken | null>
  save(qrToken: QrToken, businessId: BusinessId): Promise<void>
}
