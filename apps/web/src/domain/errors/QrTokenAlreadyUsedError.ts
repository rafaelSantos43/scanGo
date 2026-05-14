import { DomainError } from './DomainError'

export class QrTokenAlreadyUsedError extends DomainError {
  readonly code = 'QR_TOKEN_ALREADY_USED'

  constructor() {
    super('El token QR ya fue utilizado')
  }
}
