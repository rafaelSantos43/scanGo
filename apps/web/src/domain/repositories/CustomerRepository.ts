import type { Customer } from '../entities/Customer'
import type { Email } from '../value-objects/Email'
import type { BusinessId, CustomerId } from '../value-objects/ids'

export interface CustomerRepository {
  findById(id: CustomerId, businessId: BusinessId): Promise<Customer | null>
  findByEmail(email: Email, businessId: BusinessId): Promise<Customer | null>
}
