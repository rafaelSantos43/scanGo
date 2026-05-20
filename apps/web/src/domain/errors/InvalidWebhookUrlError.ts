import { DomainError } from './DomainError'

export class InvalidWebhookUrlError extends DomainError {
  readonly code = 'INVALID_WEBHOOK_URL'

  constructor(message = 'La URL del webhook debe ser HTTPS válida') {
    super(message)
  }
}
