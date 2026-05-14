import {
  BusinessId,
  CustomerId,
  UserId,
  type BusinessId as TBusinessId,
  type CustomerId as TCustomerId,
  type UserId as TUserId,
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

export interface AdminAuthContext {
  userId: TUserId
  businessId: TBusinessId
}

export class UnauthenticatedAdminError extends Error {
  override readonly name = 'UnauthenticatedAdminError'
}

/**
 * TODO(auth): cuando exista SupabaseAuthProvider, leer la cookie HttpOnly del
 * admin (sesion de Supabase Auth) y resolver userId + businessId desde el JWT
 * validando que el user es admin de ese business via business_admins. Hoy se
 * acepta por headers para desbloquear desarrollo:
 *   X-User-Id: <uuid>
 *   X-Business-Id: <uuid>
 *
 * Marcado para refactor cuando entre el chunk de auth.
 */
export function getAdminAuthContext(req: Request): AdminAuthContext {
  const userId = req.headers.get('x-user-id')
  const businessId = req.headers.get('x-business-id')
  if (!userId || !businessId) {
    throw new UnauthenticatedAdminError()
  }
  return {
    userId: UserId(userId),
    businessId: BusinessId(businessId),
  }
}
