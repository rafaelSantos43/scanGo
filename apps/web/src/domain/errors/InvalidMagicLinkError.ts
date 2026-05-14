import { DomainError } from './DomainError'

export class InvalidMagicLinkError extends DomainError {
  readonly code = 'INVALID_MAGIC_LINK'

  constructor() {
    super('Magic link inválido o expirado')
  }
}
