import { QrToken } from '@/domain/entities/QrToken'
import {
  BusinessId,
  CustomerId,
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
      generatedAt: entity.generatedAt,
      expiresAt: entity.expiresAt,
      usedBy: entity.usedBy,
      usedAt: entity.usedAt,
    }
  }
}
