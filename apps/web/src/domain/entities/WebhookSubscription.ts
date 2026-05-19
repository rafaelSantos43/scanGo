import type { WebhookEventType } from '../events/WebhookEvent'
import type { BusinessId, WebhookSubscriptionId } from '../value-objects/ids'

export type WebhookSubscriptionStatus = 'active' | 'disabled'

export interface WebhookSubscriptionProps {
  id: WebhookSubscriptionId
  businessId: BusinessId
  url: string
  signingSecret: string
  events: WebhookEventType[]
  status: WebhookSubscriptionStatus
  createdAt: Date
}

/**
 * Endpoint HTTPS de un negocio suscrito a eventos. El `signingSecret` es
 * único por suscripción y se usa para firmar cada entrega con HMAC
 * (ARCHITECTURE §10.3) — no es una env var.
 */
export class WebhookSubscription {
  readonly id: WebhookSubscriptionId
  readonly businessId: BusinessId
  readonly url: string
  readonly signingSecret: string
  readonly events: readonly WebhookEventType[]
  readonly status: WebhookSubscriptionStatus
  readonly createdAt: Date

  constructor(props: WebhookSubscriptionProps) {
    this.id = props.id
    this.businessId = props.businessId
    this.url = props.url
    this.signingSecret = props.signingSecret
    this.events = props.events
    this.status = props.status
    this.createdAt = props.createdAt
  }

  isActive(): boolean {
    return this.status === 'active'
  }

  isSubscribedTo(eventType: WebhookEventType): boolean {
    return this.events.includes(eventType)
  }
}
