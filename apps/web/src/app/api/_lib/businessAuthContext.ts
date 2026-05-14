import {
  BusinessId,
  type BusinessId as TBusinessId,
} from '@/domain/value-objects/ids'

export interface BusinessAuthContext {
  businessId: TBusinessId
}

export class UnauthenticatedBusinessError extends Error {
  override readonly name = 'UnauthenticatedBusinessError'
}

/**
 * TODO(auth): este stub se reemplaza por validacion real de API key
 * (header `Authorization: Bearer sg_<random>`, lookup en `api_keys`,
 * argon2 verify, scope check) cuando exista el chunk de auth y la tabla
 * `api_keys`. Hoy se acepta el negocio por header para desbloquear
 * desarrollo.
 *
 * Header temporal esperado:
 *   X-Business-Id: <uuid>
 */
export function getBusinessAuthContext(req: Request): BusinessAuthContext {
  const businessId = req.headers.get('x-business-id')
  if (!businessId) {
    throw new UnauthenticatedBusinessError()
  }
  return { businessId: BusinessId(businessId) }
}
