import {
  API_KEY_PREFIX_LENGTH,
  type ApiKeyScope,
} from '@/domain/entities/ApiKey'
import type { BusinessId } from '@/domain/value-objects/ids'
import {
  buildApiKeyHasher,
  buildApiKeyRepository,
} from '@/infrastructure/composition'

export interface BusinessAuthContext {
  businessId: BusinessId
  scope: ApiKeyScope
}

/** La key no es válida: ausente, malformada, inexistente o revocada → 401. */
export class ApiKeyInvalidError extends Error {
  override readonly name = 'ApiKeyInvalidError'
}

/** La key es válida pero su scope no alcanza para la operación → 403. */
export class ApiKeyScopeError extends Error {
  override readonly name = 'ApiKeyScopeError'
}

/**
 * Autentica un request de integrador externo por API key. Lee el header
 * `Authorization: Bearer sg_<key>`, busca por prefijo, verifica el valor
 * con argon2, rechaza si está revocada y comprueba el scope. Resuelve el
 * negocio A PARTIR de la key (RF-03, ARCHITECTURE §8.3).
 */
export async function getBusinessAuthContext(
  req: Request,
  requiredScope: ApiKeyScope,
): Promise<BusinessAuthContext> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token.startsWith('sg_')) {
    throw new ApiKeyInvalidError()
  }

  const apiKey = await buildApiKeyRepository().findByPrefix(
    token.slice(0, API_KEY_PREFIX_LENGTH),
  )
  if (!apiKey) throw new ApiKeyInvalidError()

  const matches = await buildApiKeyHasher().verify(token, apiKey.hashedKey)
  if (!matches || apiKey.isRevoked()) {
    throw new ApiKeyInvalidError()
  }

  if (!apiKey.allows(requiredScope)) {
    throw new ApiKeyScopeError()
  }

  return { businessId: apiKey.businessId, scope: apiKey.scope }
}
