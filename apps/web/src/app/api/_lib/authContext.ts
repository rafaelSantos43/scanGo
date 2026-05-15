import {
  buildAuthProvider,
  buildBusinessAdminRepository,
} from '@/infrastructure/composition'
import {
  BusinessId,
  CustomerId,
  type BusinessId as TBusinessId,
  type CustomerId as TCustomerId,
  type UserId as TUserId,
} from '@/domain/value-objects/ids'
import { readSessionCookie } from './sessionCookie'

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
 * Resuelve el admin autenticado desde la cookie de sesion HttpOnly
 * (`sg_admin_session`, contiene el access_token de Supabase). Valida el
 * JWT contra Supabase y resuelve el negocio via `business_admins`.
 * Lanza `UnauthenticatedAdminError` si: no hay cookie, el JWT es
 * invalido/expirado, o el user dejo de ser admin de algun negocio.
 *
 * Es async y no recibe `req`: lee la cookie con `cookies()` de
 * next/headers, asi sirve tanto en Route Handlers como en Server
 * Components (ej. la pagina `/dashboard`).
 */
export async function getAdminAuthContext(): Promise<AdminAuthContext> {
  const token = await readSessionCookie()
  if (!token) {
    throw new UnauthenticatedAdminError()
  }

  const userId = await buildAuthProvider().verifySession(token)
  if (!userId) {
    throw new UnauthenticatedAdminError()
  }

  const admins = await buildBusinessAdminRepository().findBusinessesByUserId(
    userId,
  )
  if (admins.length === 0) {
    throw new UnauthenticatedAdminError()
  }

  // N negocios → el primero (selector multi-negocio fuera de alcance).
  return {
    userId,
    businessId: admins[0]!.businessId,
  }
}
