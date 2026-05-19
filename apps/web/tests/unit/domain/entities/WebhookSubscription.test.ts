import { describe, expect, test } from 'bun:test'
import { WebhookSubscription } from '@/domain/entities/WebhookSubscription'
import type { WebhookSubscriptionStatus } from '@/domain/entities/WebhookSubscription'
import { BusinessId, WebhookSubscriptionId } from '@/domain/value-objects/ids'

const SUB_ID = WebhookSubscriptionId('11111111-1111-1111-1111-111111111111')
const BUSINESS_ID = BusinessId('22222222-2222-2222-2222-222222222222')

function makeSubscription(
  status: WebhookSubscriptionStatus = 'active',
): WebhookSubscription {
  return new WebhookSubscription({
    id: SUB_ID,
    businessId: BUSINESS_ID,
    url: 'https://crm.example.com/hooks/scango',
    signingSecret: 'whsec_test',
    events: ['attendance.created'],
    status,
    createdAt: new Date('2026-05-01T00:00:00Z'),
  })
}

describe('WebhookSubscription', () => {
  test('constructor stores all props', () => {
    const s = makeSubscription()
    expect(s.id).toBe(SUB_ID)
    expect(s.businessId).toBe(BUSINESS_ID)
    expect(s.url).toBe('https://crm.example.com/hooks/scango')
    expect(s.signingSecret).toBe('whsec_test')
    expect(s.events).toEqual(['attendance.created'])
    expect(s.status).toBe('active')
  })

  test('isActive reflects status', () => {
    expect(makeSubscription('active').isActive()).toBe(true)
    expect(makeSubscription('disabled').isActive()).toBe(false)
  })

  test('isSubscribedTo true for a subscribed event', () => {
    expect(makeSubscription().isSubscribedTo('attendance.created')).toBe(true)
  })

  test('isSubscribedTo false for an event not in the list', () => {
    expect(makeSubscription().isSubscribedTo('package.depleted')).toBe(false)
  })
})
