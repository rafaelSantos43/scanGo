import { Location } from '@/domain/entities/Location'
import { BusinessId, LocationId } from '@/domain/value-objects/ids'
import type { locations } from '../schema'

type LocationRow = typeof locations.$inferSelect
type LocationInsert = typeof locations.$inferInsert

export class LocationMapper {
  static toDomain(row: LocationRow): Location {
    return new Location({
      id: LocationId(row.id),
      businessId: BusinessId(row.businessId),
      name: row.name,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(entity: Location): LocationInsert {
    return {
      id: entity.id,
      businessId: entity.businessId,
      name: entity.name,
      createdAt: entity.createdAt,
    }
  }
}
