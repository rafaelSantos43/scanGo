import { Package, type PackageStatus } from '@/domain/entities/Package'
import { VisitCount } from '@/domain/value-objects/VisitCount'
import { BusinessId, CustomerId, PackageId } from '@/domain/value-objects/ids'
import type { packages } from '../schema'

type PackageRow = typeof packages.$inferSelect
type PackageInsert = typeof packages.$inferInsert

export class PackageMapper {
  static toDomain(row: PackageRow): Package {
    return new Package({
      id: PackageId(row.id),
      customerId: CustomerId(row.customerId),
      businessId: BusinessId(row.businessId),
      totalVisits: new VisitCount(row.totalVisits),
      remainingVisits: new VisitCount(row.remainingVisits),
      status: row.status as PackageStatus,
      purchasedAt: row.purchasedAt,
      expiresAt: row.expiresAt,
    })
  }

  static toPersistence(entity: Package): PackageInsert {
    return {
      id: entity.id,
      customerId: entity.customerId,
      businessId: entity.businessId,
      totalVisits: entity.totalVisits.value,
      remainingVisits: entity.remainingVisits.value,
      status: entity.status,
      purchasedAt: entity.purchasedAt,
      expiresAt: entity.expiresAt,
    }
  }
}
