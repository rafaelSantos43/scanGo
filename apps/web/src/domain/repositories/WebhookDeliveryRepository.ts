import type { WebhookDelivery } from '../entities/WebhookDelivery'
import type { BusinessId } from '../value-objects/ids'

export interface WebhookDeliveryRepository {
  /**
   * Inserta una entrega pendiente en el outbox. Se llama dentro de la
   * misma transacción del escaneo (ARCHITECTURE §9.1 caso 4).
   */
  save(delivery: WebhookDelivery, businessId: BusinessId): Promise<void>
}
