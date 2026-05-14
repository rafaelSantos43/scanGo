import { DomainError } from './DomainError'

export class UnauthenticatedError extends DomainError {
  readonly code = 'UNAUTHENTICATED'

  constructor() {
    super('Sesión ausente o expirada')
  }
}
