import {
  BusinessId,
  CustomerId,
  type BusinessId as TBusinessId,
  type CustomerId as TCustomerId,
} from '@/domain/value-objects/ids'

export interface CustomerAuthContext {
  customerId: TCustomerId
  businessId: TBusinessId
}

export class UnauthenticatedCustomerError extends Error {
  override readonly name = 'UnauthenticatedCustomerError'
}

/**
 * TODO(auth): cuando exista SupabaseAuthProvider, leer la cookie HttpOnly del
 * cliente final (magic link) y resolver customerId + businessId desde el JWT.
 * Hoy se acepta por headers para desbloquear desarrollo.
 *
 * Headers temporales esperados (solo en local/dev):
 *   X-Customer-Id: <uuid>
 *   X-Business-Id: <uuid>
 *
 * En produccion, esta funcion debera ignorar esos headers y obligar a la
 * cookie. Marcar para refactor en el chunk de auth.
 */
export function getCustomerAuthContext(req: Request): CustomerAuthContext {
  const customerId = req.headers.get('x-customer-id')
  const businessId = req.headers.get('x-business-id')
  if (!customerId || !businessId) {
    throw new UnauthenticatedCustomerError()
  }
  return {
    customerId: CustomerId(customerId),
    businessId: BusinessId(businessId),
  }
}
