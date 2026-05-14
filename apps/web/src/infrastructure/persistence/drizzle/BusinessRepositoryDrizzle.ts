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
}
