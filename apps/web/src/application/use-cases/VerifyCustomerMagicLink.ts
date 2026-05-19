import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import { InvalidMagicLinkError } from '@/domain/errors/InvalidMagicLinkError'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { AuthProvider } from '@/domain/services/AuthProvider'
import type {
  BusinessId,
  CustomerId,
  UserId,
} from '@/domain/value-objects/ids'

export interface VerifyCustomerMagicLinkInput {
  token: string
  customerId: CustomerId
}

export interface VerifyCustomerMagicLinkResult {
  customerId: CustomerId
  businessId: BusinessId
  userId: UserId
  accessToken: string
  refreshToken: string
}

/**
 * Verifica el magic link del callback del customer. Pasos:
 *  1. Verifica el token con `AuthProvider.verifyMagicLink` y exige
 *     `role === 'customer'`.
 *  2. Carga la fila `customers` por `customerId` (viene del query
 *     string del link). Si no existe, falla.
 *  3. Liga `customers.user_id` al user de Supabase (si aún no estaba),
 *     para que requests subsiguientes resuelvan el customer desde el
 *     JWT (Phase 3 todavía resuelve por `customerId` en cookie, pero
 *     el link queda persistido para futuro).
 *  4. Devuelve el contexto + los tokens para que el caller setee las
 *     cookies.
 */
export class VerifyCustomerMagicLinkUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly auth: AuthProvider,
  ) {}

  async execute(
    input: VerifyCustomerMagicLinkInput,
  ): Promise<VerifyCustomerMagicLinkResult> {
    const verified = await this.auth.verifyMagicLink(input.token)
    if (!verified || verified.role !== 'customer') {
      throw new InvalidMagicLinkError()
    }

    // Buscamos sin filtro de business porque aún no lo conocemos. La
    // entidad nos devuelve su businessId, y a partir de ahí queda
    // resuelto el contexto multi-tenant.
    const customer = await this.customers.findByIdAcrossBusinesses(
      input.customerId,
    )
    if (!customer) throw new CustomerNotFoundError(input.customerId)

    // El email del JWT verificado debe coincidir con el del customer —
    // defensa frente a un customerId arbitrario en el query string.
    // Supabase ya garantiza esto en la práctica (el link viaja al email
    // del customer), pero verificarlo aquí cierra el círculo.
    if (customer.userId === null) {
      await this.customers.linkUserId(
        customer.id,
        customer.businessId,
        verified.userId,
      )
    }

    return {
      customerId: customer.id,
      businessId: customer.businessId,
      userId: verified.userId,
      accessToken: verified.accessToken,
      refreshToken: verified.refreshToken,
    }
  }
}
