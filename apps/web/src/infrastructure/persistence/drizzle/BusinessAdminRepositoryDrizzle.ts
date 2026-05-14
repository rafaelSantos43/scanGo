import type { BusinessAdmin } from '@/domain/entities/BusinessAdmin'
import type { BusinessAdminRepository } from '@/domain/repositories/BusinessAdminRepository'
import type { BusinessId, UserId } from '@/domain/value-objects/ids'
import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { BusinessAdminMapper } from './mappers/BusinessAdminMapper'
import { businessAdmins } from './schema'

export class BusinessAdminRepositoryDrizzle implements BusinessAdminRepository {
  constructor(private readonly db: DbOrTx) {}

  async listByBusinessId(businessId: BusinessId): Promise<BusinessAdmin[]> {
    const rows = await this.db
      .select()
      .from(businessAdmins)
      .where(eq(businessAdmins.businessId, businessId))
    return rows.map((row) => BusinessAdminMapper.toDomain(row))
  }

  async findByUserAndBusiness(
    userId: UserId,
    businessId: BusinessId,
  ): Promise<BusinessAdmin | null> {
    const rows = await this.db
      .select()
      .from(businessAdmins)
      .where(
        and(
          eq(businessAdmins.userId, userId),
          eq(businessAdmins.businessId, businessId),
        ),
      )
      .limit(1)
    return rows[0] ? BusinessAdminMapper.toDomain(rows[0]) : null
  }

  async findBusinessesByUserId(userId: UserId): Promise<BusinessAdmin[]> {
    const rows = await this.db
      .select()
      .from(businessAdmins)
      .where(eq(businessAdmins.userId, userId))
    return rows.map((row) => BusinessAdminMapper.toDomain(row))
  }

  async save(admin: BusinessAdmin, businessId: BusinessId): Promise<void> {
    if (admin.businessId !== businessId) {
      throw new Error(
        'BusinessAdmin businessId does not match expected businessId',
      )
    }
    const row = BusinessAdminMapper.toPersistence(admin)
    await this.db.insert(businessAdmins).values(row)
  }
}
