import { Business, type BusinessType } from '@/domain/entities/Business'
import { Slug } from '@/domain/value-objects/Slug'
import { Timezone } from '@/domain/value-objects/Timezone'
import { BusinessId } from '@/domain/value-objects/ids'
import type { businesses } from '../schema'

type BusinessRow = typeof businesses.$inferSelect
type BusinessInsert = typeof businesses.$inferInsert

export class BusinessMapper {
  static toDomain(row: BusinessRow): Business {
    return new Business({
      id: BusinessId(row.id),
      slug: new Slug(row.slug),
      name: row.name,
      type: row.type as BusinessType,
      timezone: new Timezone(row.timezone),
      createdAt: row.createdAt,
    })
  }

  static toPersistence(entity: Business): BusinessInsert {
    return {
      id: entity.id,
      slug: entity.slug.value,
      name: entity.name,
      type: entity.type,
      timezone: entity.timezone.value,
      createdAt: entity.createdAt,
    }
  }
}
