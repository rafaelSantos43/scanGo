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

// Reagendado tras un fallo, indexado por (intento tras incremento) - 1.
// RF-21 / ARCHITECTURE §10.4: 1 intento inicial + 3 reintentos a 1min,
// 5min, 30min; tras el 3er reintento fallido la entrega queda 'failed'.
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000] as const

/**
 * Fila del outbox de webhooks (ARCHITECTURE §9.1 caso 4, §10.4). El flujo
 * de escaneo la crea en estado `pending`; el cron `DeliverWebhook` la
 * entrega y la transiciona con `markDelivered` / `markFailedAttempt`.
 */
export class WebhookDelivery {
  readonly id: WebhookDeliveryId
  readonly subscriptionId: WebhookSubscriptionId
  readonly businessId: BusinessId
  readonly eventType: WebhookEventType
  readonly payload: unknown
  readonly createdAt: Date
  private _status: WebhookDeliveryStatus
  private _attempt: number
  private _nextAttemptAt: Date
  private _deliveredAt: Date | null
  private _lastError: string | null

  constructor(props: WebhookDeliveryProps) {
    this.id = props.id
    this.subscriptionId = props.subscriptionId
    this.businessId = props.businessId
    this.eventType = props.eventType
    this.payload = props.payload
    this.createdAt = props.createdAt
    this._status = props.status
    this._attempt = props.attempt
    this._nextAttemptAt = props.nextAttemptAt
    this._deliveredAt = props.deliveredAt
    this._lastError = props.lastError
  }

  get status(): WebhookDeliveryStatus {
    return this._status
  }

  get attempt(): number {
    return this._attempt
  }

  get nextAttemptAt(): Date {
    return this._nextAttemptAt
  }

  get deliveredAt(): Date | null {
    return this._deliveredAt
  }

  get lastError(): string | null {
    return this._lastError
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

  /** Marca la entrega como entregada con éxito. */
  markDelivered(now: Date): void {
    this._status = 'delivered'
    this._deliveredAt = now
    this._lastError = null
  }

  /**
   * Registra un intento fallido: incrementa el contador y reagenda según
   * RF-21. Tras agotar los reintentos la entrega queda `failed`.
   */
  markFailedAttempt(now: Date, error: string): void {
    this._attempt += 1
    this._lastError = error
    const delay = RETRY_DELAYS_MS[this._attempt - 1]
    if (delay === undefined) {
      this._status = 'failed'
      return
    }
    this._status = 'pending'
    this._nextAttemptAt = new Date(now.getTime() + delay)
  }
}
