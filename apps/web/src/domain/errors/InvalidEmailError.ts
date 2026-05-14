import { DomainError } from './DomainError'

export class InvalidEmailError extends DomainError {
  readonly code = 'INVALID_EMAIL'

  constructor(raw: string) {
    super(`Email inválido: "${raw}"`)
  }
}
