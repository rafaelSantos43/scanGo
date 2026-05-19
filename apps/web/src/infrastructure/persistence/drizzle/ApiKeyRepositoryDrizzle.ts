import type { ApiKey } from '@/domain/entities/ApiKey'
import type { ApiKeyRepository } from '@/domain/repositories/ApiKeyRepository'
import type { ApiKeyId, BusinessId } from '@/domain/value-objects/ids'
import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { ApiKeyMapper } from './mappers/ApiKeyMapper'
import { apiKeys } from './schema'

export class ApiKeyRepositoryDrizzle implements ApiKeyRepository {
  constructor(private readonly db: DbOrTx) {}

  async save(apiKey: ApiKey, businessId: BusinessId): Promise<void> {
    if (apiKey.businessId !== businessId) {
      throw new Error('ApiKey businessId does not match expected businessId')
    }
    await this.db.insert(apiKeys).values(ApiKeyMapper.toPersistence(apiKey))
  }

  async findByPrefix(prefix: string): Promise<ApiKey | null> {
    // Cross-tenant a propósito: el negocio se resuelve a partir de la key.
    const rows = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.prefix, prefix))
      .limit(1)
    return rows[0] ? ApiKeyMapper.toDomain(rows[0]) : null
  }

  async findById(
    id: ApiKeyId,
    businessId: BusinessId,
  ): Promise<ApiKey | null> {
    const rows = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.businessId, businessId)))
      .limit(1)
    return rows[0] ? ApiKeyMapper.toDomain(rows[0]) : null
  }

  async update(apiKey: ApiKey, businessId: BusinessId): Promise<void> {
    if (apiKey.businessId !== businessId) {
      throw new Error('ApiKey businessId does not match expected businessId')
    }
    await this.db
      .update(apiKeys)
      .set({ revokedAt: apiKey.revokedAt })
      .where(and(eq(apiKeys.id, apiKey.id), eq(apiKeys.businessId, businessId)))
  }
}
