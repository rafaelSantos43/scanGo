import { DomainError } from './DomainError'

/**
 * El usuario se autentico correctamente (magic link valido) pero no es
 * administrador de ningun negocio — no hay fila en `business_admins`
 * para su user_id. Esta autenticado, no autorizado: mapea a 403.
 */
export class NotABusinessAdminError extends DomainError {
  readonly code = 'NOT_A_BUSINESS_ADMIN'

  constructor() {
    super('Esta cuenta no es administradora de ningún negocio')
  }
}
