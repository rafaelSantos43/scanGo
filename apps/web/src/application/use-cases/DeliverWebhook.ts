import type { WebhookDeliveryRepository } from '@/domain/repositories/WebhookDeliveryRepository'
import type { WebhookSubscriptionRepository } from '@/domain/repositories/WebhookSubscriptionRepository'
import type { Clock } from '@/domain/services/Clock'
import type { WebhookDispatcher } from '@/domain/services/WebhookDispatcher'

// Tope de entregas por corrida. ARCHITECTURE §10.5: con P95 ~1s por
// entrega cabe en el timeout serverless; lo que sobra lo toma el próximo
// tick del cron — no se pierde, sigue en el outbox.
const BATCH_LIMIT = 50

export interface DeliverWebhookResult {
  processed: number
  delivered: number
  /** Entregas que agotaron sus reintentos en esta corrida. */
  failed: number
}

/**
 * Procesa el outbox de webhooks: toma las entregas `pending` vencidas,
 * intenta despacharlas firmadas y persiste el resultado (entregada, o
 * reagendada/`failed` según RF-21). Lo invoca el cron cada minuto.
 */
export class DeliverWebhookUseCase {
  constructor(
    private readonly deliveries: WebhookDeliveryRepository,
    private readonly subscriptions: WebhookSubscriptionRepository,
    private readonly dispatcher: WebhookDispatcher,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<DeliverWebhookResult> {
    const now = this.clock.now()
    const due = await this.deliveries.listPendingDue(now, BATCH_LIMIT)

    let delivered = 0
    let failed = 0

    for (const delivery of due) {
      const subscription = await this.subscriptions.findById(
        delivery.subscriptionId,
        delivery.businessId,
      )

      if (!subscription) {
        // La suscripción ya no existe: cuenta como intento fallido para
        // que agote reintentos en vez de quedar pendiente para siempre.
        delivery.markFailedAttempt(now, 'subscription not found')
      } else {
        const result = await this.dispatcher.dispatch(delivery, subscription)
        if (result.ok) {
          delivery.markDelivered(now)
        } else {
          delivery.markFailedAttempt(now, result.error ?? 'unknown error')
        }
      }

      await this.deliveries.update(delivery, delivery.businessId)

      if (delivery.status === 'delivered') delivered++
      else if (delivery.status === 'failed') failed++
    }

    return { processed: due.length, delivered, failed }
  }
}
