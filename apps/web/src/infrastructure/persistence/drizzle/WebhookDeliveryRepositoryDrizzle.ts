import type { WebhookDelivery } from '@/domain/entities/WebhookDelivery'
import type { WebhookDeliveryRepository } from '@/domain/repositories/WebhookDeliveryRepository'
import type { BusinessId } from '@/domain/value-objects/ids'
import { and, asc, eq, lte } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { WebhookDeliveryMapper } from './mappers/WebhookDeliveryMapper'
import { webhookDeliveries } from './schema'

export class WebhookDeliveryRepositoryDrizzle
  implements WebhookDeliveryRepository
{
  constructor(private readonly db: DbOrTx) {}

  async save(delivery: WebhookDelivery, businessId: BusinessId): Promise<void> {
    if (delivery.businessId !== businessId) {
      throw new Error(
        'WebhookDelivery businessId does not match expected businessId',
      )
    }
    await this.db
      .insert(webhookDeliveries)
      .values(WebhookDeliveryMapper.toPersistence(delivery))
  }

  async listPendingDue(now: Date, limit: number): Promise<WebhookDelivery[]> {
    // Cross-tenant a propósito: el cron procesa el outbox de todos los
    // negocios. Sin filtro de business_id (ARCHITECTURE §10.5).
    const rows = await this.db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, 'pending'),
          lte(webhookDeliveries.nextAttemptAt, now),
        ),
      )
      .orderBy(asc(webhookDeliveries.nextAttemptAt))
      .limit(limit)
    return rows.map(WebhookDeliveryMapper.toDomain)
  }

  async update(
    delivery: WebhookDelivery,
    businessId: BusinessId,
  ): Promise<void> {
    if (delivery.businessId !== businessId) {
      throw new Error(
        'WebhookDelivery businessId does not match expected businessId',
      )
    }
    await this.db
      .update(webhookDeliveries)
      .set({
        status: delivery.status,
        attempt: delivery.attempt,
        nextAttemptAt: delivery.nextAttemptAt,
        deliveredAt: delivery.deliveredAt,
        lastError: delivery.lastError,
      })
      .where(
        and(
          eq(webhookDeliveries.id, delivery.id),
          eq(webhookDeliveries.businessId, businessId),
        ),
      )
  }
}
