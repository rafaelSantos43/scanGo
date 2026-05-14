import type { Business } from '../entities/Business'
import type { Slug } from '../value-objects/Slug'
import type { BusinessId } from '../value-objects/ids'

export interface BusinessRepository {
  findById(id: BusinessId, businessId: BusinessId): Promise<Business | null>
  findBySlug(slug: Slug): Promise<Business | null>
  /**
   * Persiste un negocio. businessId es redundante con business.id por
   * consistencia con la regla §3.4 del agent_data (todo metodo de repo
   * multi-tenant lleva businessId). La impl valida que coincidan.
   *
   * El manejo de colisiones por slug (UNIQUE) lo asume RegisterBusiness
   * cuando se implemente — aqui se propaga el error de Postgres.
   */
  save(business: Business, businessId: BusinessId): Promise<void>
}
