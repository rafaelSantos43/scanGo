import { QrToken } from '@/domain/entities/QrToken'
import {
  BusinessId,
  CustomerId,
  LocationId,
  QrTokenValue,
} from '@/domain/value-objects/ids'
import type { qrTokens } from '../schema'

type QrTokenRow = typeof qrTokens.$inferSelect
type QrTokenInsert = typeof qrTokens.$inferInsert

export class QrTokenMapper {
  static toDomain(row: QrTokenRow): QrToken {
    return new QrToken({
      token: QrTokenValue(row.token),
      businessId: BusinessId(row.businessId),
      locationId: LocationId(row.locationId),
      generatedAt: row.generatedAt,
      expiresAt: row.expiresAt,
      usedBy: row.usedBy ? CustomerId(row.usedBy) : null,
      usedAt: row.usedAt,
    })
  }

  static toPersistence(entity: QrToken): QrTokenInsert {
    return {
      token: entity.token,
      businessId: entity.businessId,
      locationId: entity.locationId,
      generatedAt: entity.generatedAt,
      expiresAt: entity.expiresAt,
      usedBy: entity.usedBy,
      usedAt: entity.usedAt,
    }
  }
}
