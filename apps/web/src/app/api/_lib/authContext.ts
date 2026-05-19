import {
  buildAuthProvider,
  buildBusinessAdminRepository,
  buildCustomerRepository,
} from '@/infrastructure/composition'
import {
  CustomerId,
  type BusinessId as TBusinessId,
  type CustomerId as TCustomerId,
  type UserId as TUserId,
} from '@/domain/value-objects/ids'
import {
  readCustomerIdCookie,
  readCustomerSessionCookie,
  readSessionCookie,
} from './sessionCookie'

export interface CustomerAuthContext {
  customerId: TCustomerId
  businessId: TBusinessId
}

export class UnauthenticatedCustomerError extends Error {
  override readonly name = 'UnauthenticatedCustomerError'
}

/**
 * Resuelve el customer autenticado desde las cookies HttpOnly
 * `sg_customer_session` (access_token de Supabase) + `sg_customer_id`
 * (el id del customer, guardado por el callback del magic link).
 *
 * Valida el JWT contra Supabase y comprueba que la fila `customers` del
 * cookie efectivamente pertenece al user verificado (`customers.user_id`
 * setea por el callback en el primer click). Devuelve `customerId +
 * businessId` listos para los repos multi-tenant.
 */
export async function getCustomerAuthContext(): Promise<CustomerAuthContext> {
  const token = await readCustomerSessionCookie()
  const customerIdRaw = await readCustomerIdCookie()
  if (!token || !customerIdRaw) {
    throw new UnauthenticatedCustomerError()
  }

  const userId = await buildAuthProvider().verifySession(token)
  if (!userId) {
    throw new UnauthenticatedCustomerError()
  }

  let customerId
  try {
    customerId = CustomerId(customerIdRaw)
  } catch {
    throw new UnauthenticatedCustomerError()
  }

  const customer = await buildCustomerRepository().findByIdAcrossBusinesses(
    customerId,
  )
  if (!customer || customer.userId !== userId) {
    // La cookie de id no coincide con la sesión: rechaza. Pasa cuando
    // se manipula la cookie o cuando el customer fue borrado/relinked.
    throw new UnauthenticatedCustomerError()
  }
  if (!customer.isActive()) {
    throw new UnauthenticatedCustomerError()
  }

  return {
    customerId: customer.id,
    businessId: customer.businessId,
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
