import type { WebhookDelivery } from '../entities/WebhookDelivery'
import type { BusinessId } from '../value-objects/ids'

export interface WebhookDeliveryRepository {
  /**
   * Inserta una entrega pendiente en el outbox. Se llama dentro de la
   * misma transacción del escaneo (ARCHITECTURE §9.1 caso 4).
   */
  save(delivery: WebhookDelivery, businessId: BusinessId): Promise<void>

  /**
   * Entregas `pending` cuyo `nextAttemptAt` ya venció, ordenadas por
   * `nextAttemptAt`. Consulta CROSS-TENANT: la usa el cron, que procesa
   * el outbox de todos los negocios — es la única excepción a la regla
   * "toda query lleva business_id" (ARCHITECTURE §10.5).
   */
  listPendingDue(now: Date, limit: number): Promise<WebhookDelivery[]>

  /**
   * Persiste el resultado de un intento de entrega (estado, intento,
   * nextAttemptAt, deliveredAt, lastError). Filtra por id + business_id.
   */
  update(delivery: WebhookDelivery, businessId: BusinessId): Promise<void>
}
