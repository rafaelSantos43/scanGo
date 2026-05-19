import type { WebhookSubscription } from '@/domain/entities/WebhookSubscription'
import type { WebhookSubscriptionRepository } from '@/domain/repositories/WebhookSubscriptionRepository'
import type { BusinessId } from '@/domain/value-objects/ids'
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
}
