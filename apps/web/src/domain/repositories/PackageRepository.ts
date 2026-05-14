import type { Package } from '../entities/Package'
import type { BusinessId, CustomerId, PackageId } from '../value-objects/ids'

export interface PackageRepository {
  findActiveByCustomerId(
    customerId: CustomerId,
    businessId: BusinessId,
  ): Promise<Package | null>
  /**
   * Carga un paquete por id, independiente de su estado (active, depleted,
   * expired). Usado por el flujo idempotente cuando ya existe una
   * asistencia del dia y necesitamos retornar el paquete asociado a esa
   * asistencia (puede ya estar depleted).
   */
  findById(
    packageId: PackageId,
    businessId: BusinessId,
  ): Promise<Package | null>
  /**
   * Persiste un paquete nuevo. Lanza CustomerAlreadyHasActivePackageError
   * si el cliente ya tiene un paquete con status='active' (partial unique
   * index one_active_package_per_customer).
   */
  save(pkg: Package, businessId: BusinessId): Promise<void>
  // Decrementa atomicamente remaining_visits y transiciona a 'depleted'
  // cuando llega a 0. Devuelve null si el paquete ya estaba en 0
  // (caso 3 de ARCHITECTURE §9.1).
  decrementVisitAtomic(
    packageId: PackageId,
    businessId: BusinessId,
  ): Promise<Package | null>
}
