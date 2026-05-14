import type { Business } from '../entities/Business'
import type { Slug } from '../value-objects/Slug'
import type { BusinessId } from '../value-objects/ids'

export interface BusinessRepository {
  findById(id: BusinessId, businessId: BusinessId): Promise<Business | null>
  findBySlug(slug: Slug): Promise<Business | null>
}
