import type { WebhookEventType } from '../events/WebhookEvent'
import type {
  BusinessId,
  WebhookDeliveryId,
  WebhookSubscriptionId,
} from '../value-objects/ids'

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed'

export interface WebhookDeliveryProps {
  id: WebhookDeliveryId
  subscriptionId: WebhookSubscriptionId
  businessId: BusinessId
  eventType: WebhookEventType
  payload: unknown
  status: WebhookDeliveryStatus
  attempt: number
  nextAttemptAt: Date
  deliveredAt: Date | null
  lastError: string | null
  createdAt: Date
}

/**
 * Fila del outbox de webhooks (ARCHITECTURE §9.1 caso 4, §10.4). El flujo
 * de escaneo solo la crea en estado `pending`; el cron `DeliverWebhook`
 * (chunk aparte) la entrega y actualiza estado/reintentos.
 */
export class WebhookDelivery {
  readonly id: WebhookDeliveryId
  readonly subscriptionId: WebhookSubscriptionId
  readonly businessId: BusinessId
  readonly eventType: WebhookEventType
  readonly payload: unknown
  readonly status: WebhookDeliveryStatus
  readonly attempt: number
  readonly nextAttemptAt: Date
  readonly deliveredAt: Date | null
  readonly lastError: string | null
  readonly createdAt: Date

  constructor(props: WebhookDeliveryProps) {
    this.id = props.id
    this.subscriptionId = props.subscriptionId
    this.businessId = props.businessId
    this.eventType = props.eventType
    this.payload = props.payload
    this.status = props.status
    this.attempt = props.attempt
    this.nextAttemptAt = props.nextAttemptAt
    this.deliveredAt = props.deliveredAt
    this.lastError = props.lastError
    this.createdAt = props.createdAt
  }

  /**
   * Entrega nueva en estado `pending`. `nextAttemptAt = now` para que el
   * cron la recoja en su próximo tick (ARCHITECTURE §10.4).
   */
  static pending(props: {
    id: WebhookDeliveryId
    subscriptionId: WebhookSubscriptionId
    businessId: BusinessId
    eventType: WebhookEventType
    payload: unknown
    now: Date
  }): WebhookDelivery {
    return new WebhookDelivery({
      id: props.id,
      subscriptionId: props.subscriptionId,
      businessId: props.businessId,
      eventType: props.eventType,
      payload: props.payload,
      status: 'pending',
      attempt: 0,
      nextAttemptAt: props.now,
      deliveredAt: null,
      lastError: null,
      createdAt: props.now,
    })
  }
}
