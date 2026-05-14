import type { Business } from '@/domain/entities/Business'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { Slug } from '@/domain/value-objects/Slug'
import type { BusinessId } from '@/domain/value-objects/ids'
import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { BusinessMapper } from './mappers/BusinessMapper'
import { businesses } from './schema'

export class BusinessRepositoryDrizzle implements BusinessRepository {
  constructor(private readonly db: DbOrTx) {}

  async findById(
    id: BusinessId,
    businessId: BusinessId,
  ): Promise<Business | null> {
    const rows = await this.db
      .select()
      .from(businesses)
      .where(and(eq(businesses.id, id), eq(businesses.id, businessId)))
      .limit(1)
    return rows[0] ? BusinessMapper.toDomain(rows[0]) : null
  }

  async findBySlug(slug: Slug): Promise<Business | null> {
    const rows = await this.db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, slug.value))
      .limit(1)
    return rows[0] ? BusinessMapper.toDomain(rows[0]) : null
  }

  async save(business: Business, businessId: BusinessId): Promise<void> {
    if (business.id !== businessId) {
      throw new Error('Business id does not match expected businessId')
    }
    const row = BusinessMapper.toPersistence(business)
    await this.db
      .insert(businesses)
      .values(row)
      .onConflictDoUpdate({
        target: businesses.id,
        set: {
          name: row.name,
          type: row.type,
          timezone: row.timezone,
        },
      })
    // Slug unique violation no se mapea aqui: el slug solo se asigna en
    // RegisterBusiness (futuro). Si surge una colision por slug, propaga
    // el error de Postgres y RegisterBusiness la mapeara cuando exista.
  }
}
