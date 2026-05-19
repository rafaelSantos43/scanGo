import type { WebhookDelivery } from '@/domain/entities/WebhookDelivery'
import type { WebhookDeliveryRepository } from '@/domain/repositories/WebhookDeliveryRepository'
import type { BusinessId } from '@/domain/value-objects/ids'
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
}
