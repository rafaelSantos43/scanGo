import { DomainError } from './DomainError'

export class NoWebhookEventsError extends DomainError {
  readonly code = 'NO_WEBHOOK_EVENTS'

  constructor() {
    super('Debes suscribirte al menos a un evento')
  }
}
