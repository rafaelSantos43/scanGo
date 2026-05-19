import type { WebhookDelivery } from '../entities/WebhookDelivery'
import type { WebhookSubscription } from '../entities/WebhookSubscription'

export interface WebhookDispatchResult {
  ok: boolean
  /** Motivo del fallo cuando ok=false (status HTTP, timeout, etc.). */
  error: string | null
}

export interface WebhookDispatcher {
  /**
   * Hace UN intento de entrega: firma el payload con HMAC usando el
   * signingSecret de la suscripción y hace POST a su url. No reintenta
   * ni reagenda — eso lo decide el use case (ARCHITECTURE §10.5).
   */
  dispatch(
    delivery: WebhookDelivery,
    subscription: WebhookSubscription,
  ): Promise<WebhookDispatchResult>
}
