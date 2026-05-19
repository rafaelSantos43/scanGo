import {
  WebhookSubscription,
  type WebhookSubscriptionStatus,
} from '@/domain/entities/WebhookSubscription'
import type { WebhookEventType } from '@/domain/events/WebhookEvent'
import { BusinessId, WebhookSubscriptionId } from '@/domain/value-objects/ids'
import type { webhookSubscriptions } from '../schema'

type Row = typeof webhookSubscriptions.$inferSelect
type Insert = typeof webhookSubscriptions.$inferInsert

export class WebhookSubscriptionMapper {
  static toDomain(row: Row): WebhookSubscription {
    return new WebhookSubscription({
      id: WebhookSubscriptionId(row.id),
      businessId: BusinessId(row.businessId),
      url: row.url,
      signingSecret: row.signingSecret,
      events: row.events as WebhookEventType[],
      status: row.status as WebhookSubscriptionStatus,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(entity: WebhookSubscription): Insert {
    return {
      id: entity.id,
      businessId: entity.businessId,
      url: entity.url,
      signingSecret: entity.signingSecret,
      events: [...entity.events],
      status: entity.status,
      createdAt: entity.createdAt,
    }
  }
}
