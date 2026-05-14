import { DomainError } from './DomainError'

export class QrTokenNotFoundError extends DomainError {
  readonly code = 'QR_TOKEN_NOT_FOUND'

  constructor() {
    super('Token QR no encontrado')
  }
}
