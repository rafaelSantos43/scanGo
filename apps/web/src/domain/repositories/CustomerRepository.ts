import type { Customer } from '../entities/Customer'
import type { Email } from '../value-objects/Email'
import type {
  BusinessId,
  CustomerId,
  UserId,
} from '../value-objects/ids'

/**
 * Read-model plano para listar clientes en el dashboard, con su paquete
 * activo embebido (o null si no tiene). No es una entidad de dominio.
 */
export interface CustomerListItem {
  customerId: string
  fullName: string
  email: string
  phone: string | null
  status: 'active' | 'disabled'
  activePackage: {
    packageId: string
    totalVisits: number
    remainingVisits: number
    status: 'active' | 'depleted' | 'expired'
  } | null
}

export interface CustomerRepository {
  findById(id: CustomerId, businessId: BusinessId): Promise<Customer | null>
  findByEmail(email: Email, businessId: BusinessId): Promise<Customer | null>

  /**
   * Busca por id SIN filtro de business — consulta CROSS-TENANT. La usa
   * el callback del magic link del customer: viene un `customer_id` en
   * el query string del link y aún no conocemos su business hasta
   * resolver la fila (mismo patrón que `ApiKeyRepository.findByPrefix`).
   */
  findByIdAcrossBusinesses(id: CustomerId): Promise<Customer | null>

  /**
   * Liga `customers.user_id` al user de Supabase tras un magic link
   * exitoso. Idempotente: solo escribe si la fila aún no tiene user_id
   * (UPDATE ... WHERE user_id IS NULL), así que un reintento del flujo
   * por el mismo customer no reescribe ni rompe.
   */
  linkUserId(
    id: CustomerId,
    businessId: BusinessId,
    userId: UserId,
  ): Promise<void>

  /**
   * Lista los clientes de un negocio con su paquete activo embebido,
   * ordenados por nombre. Para el dashboard del negocio.
   */
  listByBusinessWithActivePackage(
    businessId: BusinessId,
  ): Promise<CustomerListItem[]>
  /**
   * Persiste un cliente nuevo. Lanza CustomerEmailAlreadyExistsError si
   * el email ya existe para ese business_id (constraint UNIQUE
   * customers_business_email_unique). Es insert, no upsert.
   */
  save(customer: Customer, businessId: BusinessId): Promise<void>

  /**
   * Actualiza full_name, email, phone y status de un cliente existente.
   * No toca user_id ni created_at. Lanza CustomerEmailAlreadyExistsError
   * si el nuevo email colisiona con otro cliente del mismo negocio.
   */
  update(customer: Customer, businessId: BusinessId): Promise<void>
}
