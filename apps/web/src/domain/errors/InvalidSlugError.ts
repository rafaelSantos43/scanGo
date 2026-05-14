import { DomainError } from './DomainError'

export class InvalidSlugError extends DomainError {
  readonly code = 'INVALID_SLUG'

  constructor(raw: string) {
    super(`Slug inválido: "${raw}"`)
  }
}
