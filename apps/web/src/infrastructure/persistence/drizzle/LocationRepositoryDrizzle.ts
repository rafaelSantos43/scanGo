import type { Location } from '@/domain/entities/Location'
import type { LocationRepository } from '@/domain/repositories/LocationRepository'
import type { BusinessId, LocationId } from '@/domain/value-objects/ids'
import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { LocationMapper } from './mappers/LocationMapper'
import { locations } from './schema'

export class LocationRepositoryDrizzle implements LocationRepository {
  constructor(private readonly db: DbOrTx) {}

  async findById(
    id: LocationId,
    businessId: BusinessId,
  ): Promise<Location | null> {
    const rows = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.businessId, businessId)))
      .limit(1)
    return rows[0] ? LocationMapper.toDomain(rows[0]) : null
  }

  async findByBusinessId(businessId: BusinessId): Promise<Location[]> {
    const rows = await this.db
      .select()
      .from(locations)
      .where(eq(locations.businessId, businessId))
    return rows.map(LocationMapper.toDomain)
  }

  async save(location: Location, businessId: BusinessId): Promise<void> {
    if (location.businessId !== businessId) {
      throw new Error('Location businessId does not match expected businessId')
    }
    const row = LocationMapper.toPersistence(location)
    await this.db
      .insert(locations)
      .values(row)
      .onConflictDoUpdate({
        target: locations.id,
        set: { name: row.name },
      })
  }
}
