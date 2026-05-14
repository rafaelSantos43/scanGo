import type { Customer } from '../entities/Customer'
import type { Email } from '../value-objects/Email'
import type { BusinessId, CustomerId } from '../value-objects/ids'

export interface CustomerRepository {
  findById(id: CustomerId, businessId: BusinessId): Promise<Customer | null>
  findByEmail(email: Email, businessId: BusinessId): Promise<Customer | null>
  /**
   * Persiste un cliente nuevo. Lanza CustomerEmailAlreadyExistsError si
   * el email ya existe para ese business_id (constraint UNIQUE
   * customers_business_email_unique).
   *
   * Es save, no upsert: no actualiza filas existentes. Edicion de
   * cliente vendra como un metodo separado (update) cuando se implemente
   * RF-06 completo.
   */
  save(customer: Customer, businessId: BusinessId): Promise<void>
}
