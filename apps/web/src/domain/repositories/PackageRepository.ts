import type { Package } from '../entities/Package'
import type { BusinessId, CustomerId } from '../value-objects/ids'

export interface PackageRepository {
  findActiveByCustomerId(
    customerId: CustomerId,
    businessId: BusinessId,
  ): Promise<Package | null>
  save(pkg: Package, businessId: BusinessId): Promise<void>
}
