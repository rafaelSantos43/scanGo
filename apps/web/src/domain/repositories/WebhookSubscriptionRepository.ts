import type { WebhookSubscription } from '../entities/WebhookSubscription'
import type { BusinessId } from '../value-objects/ids'

export interface WebhookSubscriptionRepository {
  /**
   * Suscripciones activas de un negocio. El flujo de escaneo las consulta
   * para saber a qué endpoints encolar entregas tras una asistencia.
   */
  findActiveByBusinessId(
    businessId: BusinessId,
  ): Promise<WebhookSubscription[]>
}
