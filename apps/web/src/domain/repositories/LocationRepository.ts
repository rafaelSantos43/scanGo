import type { Location } from '../entities/Location'
import type { BusinessId, LocationId } from '../value-objects/ids'

export interface LocationRepository {
  /**
   * Busca una sede por id. El doble filtro `id` + `businessId` aplica la
   * regla multi-tenant §3.4: una sede de otro negocio devuelve `null`.
   */
  findById(id: LocationId, businessId: BusinessId): Promise<Location | null>

  /** Lista todas las sedes de un negocio (para el selector del dashboard). */
  findByBusinessId(businessId: BusinessId): Promise<Location[]>

  save(location: Location, businessId: BusinessId): Promise<void>
}
