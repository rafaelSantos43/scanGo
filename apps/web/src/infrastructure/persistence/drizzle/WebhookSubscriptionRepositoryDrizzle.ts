import type { WebhookSubscription } from '@/domain/entities/WebhookSubscription'
import type { WebhookSubscriptionRepository } from '@/domain/repositories/WebhookSubscriptionRepository'
import type {
  BusinessId,
  WebhookSubscriptionId,
} from '@/domain/value-objects/ids'
import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { WebhookSubscriptionMapper } from './mappers/WebhookSubscriptionMapper'
import { webhookSubscriptions } from './schema'

export class WebhookSubscriptionRepositoryDrizzle
  implements WebhookSubscriptionRepository
{
  constructor(private readonly db: DbOrTx) {}

  async findActiveByBusinessId(
    businessId: BusinessId,
  ): Promise<WebhookSubscription[]> {
    const rows = await this.db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.businessId, businessId),
          eq(webhookSubscriptions.status, 'active'),
        ),
      )
    return rows.map(WebhookSubscriptionMapper.toDomain)
  }

  async findById(
    id: WebhookSubscriptionId,
    businessId: BusinessId,
  ): Promise<WebhookSubscription | null> {
    const rows = await this.db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.id, id),
          eq(webhookSubscriptions.businessId, businessId),
        ),
      )
      .limit(1)
    return rows[0] ? WebhookSubscriptionMapper.toDomain(rows[0]) : null
  }
}
