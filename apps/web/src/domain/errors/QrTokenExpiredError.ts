import { DomainError } from './DomainError'

export class QrTokenExpiredError extends DomainError {
  readonly code = 'QR_TOKEN_EXPIRED'

  constructor() {
    super('El token QR ha expirado')
  }
}
