import { describe, expect, test } from 'bun:test'
import { Customer } from '@/domain/entities/Customer'
import { Email } from '@/domain/value-objects/Email'
import { BusinessId, CustomerId } from '@/domain/value-objects/ids'

const CUSTOMER_ID = CustomerId('22222222-2222-2222-2222-222222222222')
const BUSINESS_ID = BusinessId('33333333-3333-3333-3333-333333333333')

function makeCustomer(status: 'active' | 'disabled' = 'active'): Customer {
  return new Customer({
    id: CUSTOMER_ID,
    businessId: BUSINESS_ID,
    userId: null,
    fullName: 'Juan Pérez',
    email: new Email('juan@gym.com'),
    phone: null,
    status,
    createdAt: new Date('2026-05-01T00:00:00Z'),
  })
}

describe('Customer', () => {
  test('constructor stores all props', () => {
    const c = makeCustomer()
    expect(c.id).toBe(CUSTOMER_ID)
    expect(c.businessId).toBe(BUSINESS_ID)
    expect(c.fullName).toBe('Juan Pérez')
    expect(c.email.value).toBe('juan@gym.com')
    expect(c.phone).toBeNull()
    expect(c.userId).toBeNull()
    expect(c.status).toBe('active')
  })

  test('isActive true when status is active', () => {
    expect(makeCustomer('active').isActive()).toBe(true)
  })

  test('isActive false when status is disabled', () => {
    expect(makeCustomer('disabled').isActive()).toBe(false)
  })

  test('disable() flips status to disabled', () => {
    const c = makeCustomer('active')
    c.disable()
    expect(c.status).toBe('disabled')
    expect(c.isActive()).toBe(false)
  })

  test('disable() is idempotent', () => {
    const c = makeCustomer('disabled')
    c.disable()
    expect(c.status).toBe('disabled')
  })
})
