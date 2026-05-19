import type { QrToken } from '@/domain/entities/QrToken'
import type { QrTokenRepository } from '@/domain/repositories/QrTokenRepository'
import type {
  BusinessId,
  CustomerId,
  LocationId,
  QrTokenValue,
} from '@/domain/value-objects/ids'
import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { QrTokenMapper } from './mappers/QrTokenMapper'
import { qrTokens } from './schema'

export class QrTokenRepositoryDrizzle implements QrTokenRepository {
  constructor(private readonly db: DbOrTx) {}

  async findByToken(
    token: QrTokenValue,
    businessId: BusinessId,
  ): Promise<QrToken | null> {
    const rows = await this.db
      .select()
      .from(qrTokens)
      .where(
        and(eq(qrTokens.token, token), eq(qrTokens.businessId, businessId)),
      )
      .limit(1)
    return rows[0] ? QrTokenMapper.toDomain(rows[0]) : null
  }

  async save(qrToken: QrToken, businessId: BusinessId): Promise<void> {
    if (qrToken.businessId !== businessId) {
      throw new Error('QrToken businessId does not match expected businessId')
    }
    const row = QrTokenMapper.toPersistence(qrToken)
    await this.db
      .insert(qrTokens)
      .values(row)
      .onConflictDoUpdate({
        target: qrTokens.token,
        set: {
          usedBy: row.usedBy,
          usedAt: row.usedAt,
          expiresAt: row.expiresAt,
        },
      })
  }

  async findLatestActiveByLocation(
    businessId: BusinessId,
    locationId: LocationId,
    now: Date,
  ): Promise<QrToken | null> {
    const rows = await this.db
      .select()
      .from(qrTokens)
      .where(
        and(
          eq(qrTokens.businessId, businessId),
          eq(qrTokens.locationId, locationId),
          isNull(qrTokens.usedBy),
          gt(qrTokens.expiresAt, now),
        ),
      )
      .orderBy(desc(qrTokens.generatedAt))
      .limit(1)
    return rows[0] ? QrTokenMapper.toDomain(rows[0]) : null
  }

  async claim(
    token: QrTokenValue,
    businessId: BusinessId,
    customerId: CustomerId,
    now: Date,
  ): Promise<QrToken | null> {
    const rows = await this.db
      .update(qrTokens)
      .set({ usedBy: customerId, usedAt: now })
      .where(
        and(
          eq(qrTokens.token, token),
          eq(qrTokens.businessId, businessId),
          isNull(qrTokens.usedBy),
          gt(qrTokens.expiresAt, now),
        ),
      )
      .returning()
    return rows[0] ? QrTokenMapper.toDomain(rows[0]) : null
  }
}
