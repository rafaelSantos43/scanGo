import { ApiKey, type ApiKeyScope } from '@/domain/entities/ApiKey'
import { ApiKeyId, BusinessId } from '@/domain/value-objects/ids'
import type { apiKeys } from '../schema'

type Row = typeof apiKeys.$inferSelect
type Insert = typeof apiKeys.$inferInsert

export class ApiKeyMapper {
  static toDomain(row: Row): ApiKey {
    return new ApiKey({
      id: ApiKeyId(row.id),
      businessId: BusinessId(row.businessId),
      hashedKey: row.hashedKey,
      prefix: row.prefix,
      scope: row.scope as ApiKeyScope,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    })
  }

  static toPersistence(entity: ApiKey): Insert {
    return {
      id: entity.id,
      businessId: entity.businessId,
      hashedKey: entity.hashedKey,
      prefix: entity.prefix,
      scope: entity.scope,
      createdAt: entity.createdAt,
      revokedAt: entity.revokedAt,
    }
  }
}
