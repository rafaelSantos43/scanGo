import {
  ApiKey,
  API_KEY_PREFIX_LENGTH,
  type ApiKeyScope,
} from '@/domain/entities/ApiKey'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import type { ApiKeyRepository } from '@/domain/repositories/ApiKeyRepository'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { ApiKeyHasher } from '@/domain/services/ApiKeyHasher'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import { ApiKeyId, type BusinessId } from '@/domain/value-objects/ids'

export interface IssueApiKeyInput {
  businessId: BusinessId
  scope: ApiKeyScope
}

export interface IssueApiKeyResult {
  apiKey: ApiKey
  /** Valor en claro de la key — se muestra UNA sola vez, nunca se persiste. */
  plainKey: string
}

export class IssueApiKeyUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly apiKeys: ApiKeyRepository,
    private readonly hasher: ApiKeyHasher,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: IssueApiKeyInput): Promise<IssueApiKeyResult> {
    const business = await this.businesses.findById(
      input.businessId,
      input.businessId,
    )
    if (!business) throw new BusinessNotFoundError(input.businessId)

    // sg_ + 64 hex (dos UUID v4 sin guiones) → ~244 bits de entropía.
    const plainKey = `sg_${this.ids.uuid()}${this.ids.uuid()}`.replace(
      /-/g,
      '',
    )
    const hashedKey = await this.hasher.hash(plainKey)

    const apiKey = new ApiKey({
      id: ApiKeyId(this.ids.uuid()),
      businessId: input.businessId,
      hashedKey,
      prefix: plainKey.slice(0, API_KEY_PREFIX_LENGTH),
      scope: input.scope,
      createdAt: this.clock.now(),
      revokedAt: null,
    })
    await this.apiKeys.save(apiKey, input.businessId)

    return { apiKey, plainKey }
  }
}
