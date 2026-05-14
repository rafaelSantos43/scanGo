import type { Package } from '@/domain/entities/Package'
import type { PackageRepository } from '@/domain/repositories/PackageRepository'
import type { BusinessId, CustomerId, PackageId } from '@/domain/value-objects/ids'
import { and, eq, gt, sql } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { PackageMapper } from './mappers/PackageMapper'
import { packages } from './schema'

export class PackageRepositoryDrizzle implements PackageRepository {
  constructor(private readonly db: DbOrTx) {}

  async findActiveByCustomerId(
    customerId: CustomerId,
    businessId: BusinessId,
  ): Promise<Package | null> {
    const rows = await this.db
      .select()
      .from(packages)
      .where(
        and(
          eq(packages.customerId, customerId),
          eq(packages.businessId, businessId),
          eq(packages.status, 'active'),
        ),
      )
      .limit(1)
    return rows[0] ? PackageMapper.toDomain(rows[0]) : null
  }

  async save(pkg: Package, businessId: BusinessId): Promise<void> {
    if (pkg.businessId !== businessId) {
      throw new Error('Package businessId does not match expected businessId')
    }
    const row = PackageMapper.toPersistence(pkg)
    await this.db
      .insert(packages)
      .values(row)
      .onConflictDoUpdate({
        target: packages.id,
        set: {
          remainingVisits: row.remainingVisits,
          status: row.status,
          expiresAt: row.expiresAt,
        },
      })
  }

  async decrementVisitAtomic(
    packageId: PackageId,
    businessId: BusinessId,
  ): Promise<Package | null> {
    const rows = await this.db
      .update(packages)
      .set({
        remainingVisits: sql`${packages.remainingVisits} - 1`,
        status: sql`CASE WHEN ${packages.remainingVisits} = 1 THEN 'depleted' ELSE 'active' END`,
      })
      .where(
        and(
          eq(packages.id, packageId),
          eq(packages.businessId, businessId),
          gt(packages.remainingVisits, 0),
        ),
      )
      .returning()
    return rows[0] ? PackageMapper.toDomain(rows[0]) : null
  }
}
