import { DomainError } from './DomainError'

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS'

  constructor() {
    super('Credenciales inválidas')
  }
}
