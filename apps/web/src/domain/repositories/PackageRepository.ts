import type { Package } from '../entities/Package'
import type { BusinessId, CustomerId, PackageId } from '../value-objects/ids'

export interface PackageRepository {
  findActiveByCustomerId(
    customerId: CustomerId,
    businessId: BusinessId,
  ): Promise<Package | null>
  save(pkg: Package, businessId: BusinessId): Promise<void>
  // Decrementa atomicamente remaining_visits y transiciona a 'depleted'
  // cuando llega a 0. Devuelve null si el paquete ya estaba en 0
  // (caso 3 de ARCHITECTURE §9.1).
  decrementVisitAtomic(
    packageId: PackageId,
    businessId: BusinessId,
  ): Promise<Package | null>
}
