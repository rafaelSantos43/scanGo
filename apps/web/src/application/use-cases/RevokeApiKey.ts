import type { ApiKey } from '@/domain/entities/ApiKey'
import { ApiKeyNotFoundError } from '@/domain/errors/ApiKeyNotFoundError'
import type { ApiKeyRepository } from '@/domain/repositories/ApiKeyRepository'
import type { Clock } from '@/domain/services/Clock'
import type { ApiKeyId, BusinessId } from '@/domain/value-objects/ids'

export interface RevokeApiKeyInput {
  apiKeyId: ApiKeyId
  businessId: BusinessId
}

export interface RevokeApiKeyResult {
  apiKey: ApiKey
}

export class RevokeApiKeyUseCase {
  constructor(
    private readonly apiKeys: ApiKeyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RevokeApiKeyInput): Promise<RevokeApiKeyResult> {
    const apiKey = await this.apiKeys.findById(
      input.apiKeyId,
      input.businessId,
    )
    if (!apiKey) throw new ApiKeyNotFoundError(input.apiKeyId)

    apiKey.revoke(this.clock.now())
    await this.apiKeys.update(apiKey, input.businessId)

    return { apiKey }
  }
}
