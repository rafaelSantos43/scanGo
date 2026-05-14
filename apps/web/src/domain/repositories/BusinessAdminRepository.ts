import type { BusinessAdmin } from '../entities/BusinessAdmin'
import type { BusinessId, UserId } from '../value-objects/ids'

export interface BusinessAdminRepository {
  /** Lista los admins de un negocio (RF-05). */
  listByBusinessId(businessId: BusinessId): Promise<BusinessAdmin[]>

  /** Busca la relacion admin↔negocio para un user/business especifico.
   *  Util para autorizar: "este user es admin de este business?". */
  findByUserAndBusiness(
    userId: UserId,
    businessId: BusinessId,
  ): Promise<BusinessAdmin | null>

  /** Lista todos los negocios de los que `userId` es admin. Util para
   *  cuando un mismo usuario administra varios negocios (futuro). */
  findBusinessesByUserId(userId: UserId): Promise<BusinessAdmin[]>

  /** Persiste una nueva relacion admin↔negocio. */
  save(admin: BusinessAdmin, businessId: BusinessId): Promise<void>
}
