import {
  WebhookDelivery,
  type WebhookDeliveryStatus,
} from '@/domain/entities/WebhookDelivery'
import type { WebhookEventType } from '@/domain/events/WebhookEvent'
import {
  BusinessId,
  WebhookDeliveryId,
  WebhookSubscriptionId,
} from '@/domain/value-objects/ids'
import type { webhookDeliveries } from '../schema'

type Row = typeof webhookDeliveries.$inferSelect
type Insert = typeof webhookDeliveries.$inferInsert

export class WebhookDeliveryMapper {
  static toDomain(row: Row): WebhookDelivery {
    return new WebhookDelivery({
      id: WebhookDeliveryId(row.id),
      subscriptionId: WebhookSubscriptionId(row.subscriptionId),
      businessId: BusinessId(row.businessId),
      eventType: row.eventType as WebhookEventType,
      payload: row.payload,
      status: row.status as WebhookDeliveryStatus,
      attempt: row.attempt,
      nextAttemptAt: row.nextAttemptAt,
      deliveredAt: row.deliveredAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(entity: WebhookDelivery): Insert {
    return {
      id: entity.id,
      subscriptionId: entity.subscriptionId,
      businessId: entity.businessId,
      eventType: entity.eventType,
      payload: entity.payload,
      status: entity.status,
      attempt: entity.attempt,
      nextAttemptAt: entity.nextAttemptAt,
      deliveredAt: entity.deliveredAt,
      lastError: entity.lastError,
      createdAt: entity.createdAt,
    }
  }
}
