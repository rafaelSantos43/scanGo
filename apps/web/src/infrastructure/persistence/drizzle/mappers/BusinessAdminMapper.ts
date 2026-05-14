import { BusinessAdmin } from '@/domain/entities/BusinessAdmin'
import { BusinessId, UserId } from '@/domain/value-objects/ids'
import type { businessAdmins } from '../schema'

type BusinessAdminRow = typeof businessAdmins.$inferSelect
type BusinessAdminInsert = typeof businessAdmins.$inferInsert

export class BusinessAdminMapper {
  static toDomain(row: BusinessAdminRow): BusinessAdmin {
    return new BusinessAdmin({
      businessId: BusinessId(row.businessId),
      userId: UserId(row.userId),
      createdAt: row.createdAt,
    })
  }

  static toPersistence(entity: BusinessAdmin): BusinessAdminInsert {
    return {
      businessId: entity.businessId,
      userId: entity.userId,
      createdAt: entity.createdAt,
    }
  }
}
