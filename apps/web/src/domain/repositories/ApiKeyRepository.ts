import type { ApiKey } from '../entities/ApiKey'
import type { ApiKeyId, BusinessId } from '../value-objects/ids'

export interface ApiKeyRepository {
  save(apiKey: ApiKey, businessId: BusinessId): Promise<void>

  /**
   * Busca por prefijo. Consulta CROSS-TENANT: el middleware de auth
   * resuelve el negocio A PARTIR de la key, así que todavía no conoce el
   * business_id. El prefijo tiene índice UNIQUE → 0 o 1 fila.
   */
  findByPrefix(prefix: string): Promise<ApiKey | null>

  findById(id: ApiKeyId, businessId: BusinessId): Promise<ApiKey | null>

  /** Persiste el estado de revocación de una key existente. */
  update(apiKey: ApiKey, businessId: BusinessId): Promise<void>
}
