import type { ApiKey } from '@/domain/entities/ApiKey'
import type { ApiKeyRepository } from '@/domain/repositories/ApiKeyRepository'
import type { BusinessId } from '@/domain/value-objects/ids'

export interface ListApiKeysInput {
  businessId: BusinessId
}

export interface ListApiKeysResult {
  apiKeys: ApiKey[]
}

/**
 * Listado plano para el panel de API keys del dashboard. Incluye las
 * revocadas — la columna `revokedAt` distingue el estado en la UI.
 */
export class ListApiKeysUseCase {
  constructor(private readonly apiKeys: ApiKeyRepository) {}

  async execute(input: ListApiKeysInput): Promise<ListApiKeysResult> {
    const apiKeys = await this.apiKeys.listByBusinessId(input.businessId)
    return { apiKeys }
  }
}
