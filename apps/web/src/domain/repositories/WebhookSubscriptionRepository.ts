import type { WebhookSubscription } from '../entities/WebhookSubscription'
import type {
  BusinessId,
  WebhookSubscriptionId,
} from '../value-objects/ids'

export interface WebhookSubscriptionRepository {
  /**
   * Suscripciones activas de un negocio. El flujo de escaneo las consulta
   * para saber a qué endpoints encolar entregas tras una asistencia.
   */
  findActiveByBusinessId(
    businessId: BusinessId,
  ): Promise<WebhookSubscription[]>

  /**
   * Busca una suscripción por id. El cron de entrega la usa para resolver
   * url + signingSecret de cada delivery pendiente.
   */
  findById(
    id: WebhookSubscriptionId,
    businessId: BusinessId,
  ): Promise<WebhookSubscription | null>
}
