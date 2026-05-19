import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { AuthProvider } from '@/domain/services/AuthProvider'
import type { BusinessId, CustomerId } from '@/domain/value-objects/ids'

export interface RequestCustomerMagicLinkInput {
  customerId: CustomerId
  businessId: BusinessId
}

export interface RequestCustomerMagicLinkResult {
  sent: true
}

/**
 * Envía un magic link al cliente para que active su cuenta y entre a la
 * PWA. El link redirige a `/api/auth/customer/callback?customer_id=<id>`
 * para que el callback sepa qué fila de `customers` ligar al user de
 * Supabase (un mismo email puede ser cliente en N negocios, ver
 * ARCHITECTURE §8.2).
 *
 * Devuelve `{ sent: true }` aunque el cliente no exista — neutral, sin
 * filtrar información (mismo patrón que RequestAdminMagicLink). Aún
 * así, si el customerId no resuelve a una fila del negocio, lanza
 * `CustomerNotFoundError` porque es un input inválido del admin, no un
 * intento de enumeración.
 */
export class RequestCustomerMagicLinkUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly auth: AuthProvider,
    private readonly callbackBaseUrl: string,
  ) {}

  async execute(
    input: RequestCustomerMagicLinkInput,
  ): Promise<RequestCustomerMagicLinkResult> {
    const customer = await this.customers.findById(
      input.customerId,
      input.businessId,
    )
    if (!customer) throw new CustomerNotFoundError(input.customerId)

    const redirectTo = `${this.callbackBaseUrl}/api/auth/customer/callback?customer_id=${customer.id}`
    await this.auth.sendMagicLink(customer.email, 'customer', {
      emailRedirectTo: redirectTo,
    })
    return { sent: true }
  }
}
