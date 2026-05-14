import type { QrToken } from '../entities/QrToken'
import type { BusinessId, CustomerId, QrTokenValue } from '../value-objects/ids'

export interface QrTokenRepository {
  findByToken(
    token: QrTokenValue,
    businessId: BusinessId,
  ): Promise<QrToken | null>
  save(qrToken: QrToken, businessId: BusinessId): Promise<void>
  // Reclama el token atomicamente. Solo gana si used_by IS NULL y no esta
  // expirado (caso 1 de ARCHITECTURE §9.1). Devuelve null si otro cliente
  // gano la carrera o si esta expirado — el use case interpreta el null
  // y lanza el error de dominio correspondiente.
  claim(
    token: QrTokenValue,
    businessId: BusinessId,
    customerId: CustomerId,
    now: Date,
  ): Promise<QrToken | null>
}
