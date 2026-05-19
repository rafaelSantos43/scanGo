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

function makePending(): WebhookDelivery {
  return WebhookDelivery.pending({
    id: DELIVERY_ID,
    subscriptionId: SUB_ID,
    businessId: BUSINESS_ID,
    eventType: 'attendance.created',
    payload: {},
    now: new Date('2026-05-19T10:00:00Z'),
  })
}

describe('WebhookDelivery.markDelivered', () => {
  test('pasa a delivered y registra deliveredAt', () => {
    const d = makePending()
    const at = new Date('2026-05-19T10:01:00Z')
    d.markDelivered(at)
    expect(d.status).toBe('delivered')
    expect(d.deliveredAt).toBe(at)
    expect(d.lastError).toBeNull()
  })
})

describe('WebhookDelivery.markFailedAttempt', () => {
  const now = new Date('2026-05-19T12:00:00Z')

  test('1er fallo: reagenda a 1 min y guarda el error', () => {
    const d = makePending()
    d.markFailedAttempt(now, 'HTTP 500')
    expect(d.status).toBe('pending')
    expect(d.attempt).toBe(1)
    expect(d.lastError).toBe('HTTP 500')
    expect(d.nextAttemptAt.getTime()).toBe(now.getTime() + 60_000)
  })

  test('2o fallo reagenda a 5 min, 3er fallo a 30 min', () => {
    const d = makePending()
    d.markFailedAttempt(now, 'e')
    d.markFailedAttempt(now, 'e')
    expect(d.attempt).toBe(2)
    expect(d.nextAttemptAt.getTime()).toBe(now.getTime() + 5 * 60_000)
    d.markFailedAttempt(now, 'e')
    expect(d.attempt).toBe(3)
    expect(d.nextAttemptAt.getTime()).toBe(now.getTime() + 30 * 60_000)
    expect(d.status).toBe('pending')
  })

  test('4o fallo (3er reintento) deja la entrega en failed', () => {
    const d = makePending()
    d.markFailedAttempt(now, 'e')
    d.markFailedAttempt(now, 'e')
    d.markFailedAttempt(now, 'e')
    d.markFailedAttempt(now, 'timeout')
    expect(d.status).toBe('failed')
    expect(d.attempt).toBe(4)
    expect(d.lastError).toBe('timeout')
  })
})
