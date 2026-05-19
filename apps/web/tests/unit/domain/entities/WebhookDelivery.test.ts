import { describe, expect, test } from 'bun:test'
import { WebhookDelivery } from '@/domain/entities/WebhookDelivery'
import {
  BusinessId,
  WebhookDeliveryId,
  WebhookSubscriptionId,
} from '@/domain/value-objects/ids'

const DELIVERY_ID = WebhookDeliveryId('33333333-3333-3333-3333-333333333333')
const SUB_ID = WebhookSubscriptionId('11111111-1111-1111-1111-111111111111')
const BUSINESS_ID = BusinessId('22222222-2222-2222-2222-222222222222')

describe('WebhookDelivery.pending', () => {
  const now = new Date('2026-05-19T10:00:00Z')
  const delivery = WebhookDelivery.pending({
    id: DELIVERY_ID,
    subscriptionId: SUB_ID,
    businessId: BUSINESS_ID,
    eventType: 'attendance.created',
    payload: { type: 'attendance.created' },
    now,
  })

  test('arranca en estado pending sin intentos', () => {
    expect(delivery.status).toBe('pending')
    expect(delivery.attempt).toBe(0)
  })

  test('nextAttemptAt y createdAt quedan en now (el cron lo recoge ya)', () => {
    expect(delivery.nextAttemptAt).toBe(now)
    expect(delivery.createdAt).toBe(now)
  })

  test('aún no hay entrega ni error', () => {
    expect(delivery.deliveredAt).toBeNull()
    expect(delivery.lastError).toBeNull()
  })

  test('conserva identidad, evento y payload', () => {
    expect(delivery.id).toBe(DELIVERY_ID)
    expect(delivery.subscriptionId).toBe(SUB_ID)
    expect(delivery.businessId).toBe(BUSINESS_ID)
    expect(delivery.eventType).toBe('attendance.created')
    expect(delivery.payload).toEqual({ type: 'attendance.created' })
  })
})
