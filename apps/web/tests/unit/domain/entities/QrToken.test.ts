import { describe, expect, test } from 'bun:test'
import { QrToken } from '@/domain/entities/QrToken'
import { QrTokenAlreadyUsedError } from '@/domain/errors/QrTokenAlreadyUsedError'
import { QrTokenExpiredError } from '@/domain/errors/QrTokenExpiredError'
import {
  BusinessId,
  CustomerId,
  QrTokenValue,
} from '@/domain/value-objects/ids'

const TOKEN = QrTokenValue('44444444-4444-4444-4444-444444444444')
const BUSINESS_ID = BusinessId('33333333-3333-3333-3333-333333333333')
const CUSTOMER_ID = CustomerId('22222222-2222-2222-2222-222222222222')

const GENERATED_AT = new Date('2026-05-14T10:00:00Z')
const EXPIRES_AT = new Date('2026-05-15T10:00:00Z')

function makeToken(overrides: {
  usedBy?: CustomerId | null
  usedAt?: Date | null
  expiresAt?: Date
} = {}): QrToken {
  return new QrToken({
    token: TOKEN,
    businessId: BUSINESS_ID,
    generatedAt: GENERATED_AT,
    expiresAt: overrides.expiresAt ?? EXPIRES_AT,
    usedBy: overrides.usedBy ?? null,
    usedAt: overrides.usedAt ?? null,
  })
}

describe('QrToken', () => {
  test('fresh token is not used and not expired', () => {
    const t = makeToken()
    expect(t.isUsed()).toBe(false)
    expect(t.isExpired(new Date('2026-05-14T11:00:00Z'))).toBe(false)
  })

  test('isExpired returns true when now is past expiresAt', () => {
    const t = makeToken()
    expect(t.isExpired(new Date('2026-05-15T10:00:01Z'))).toBe(true)
  })

  test('isExpired returns false when now equals expiresAt exactly', () => {
    const t = makeToken()
    expect(t.isExpired(EXPIRES_AT)).toBe(false)
  })

  test('isUsed true once usedBy is set', () => {
    const t = makeToken({ usedBy: CUSTOMER_ID, usedAt: GENERATED_AT })
    expect(t.isUsed()).toBe(true)
  })

  test('markUsed sets usedBy and usedAt on a fresh token', () => {
    const t = makeToken()
    const now = new Date('2026-05-14T11:00:00Z')
    t.markUsed(CUSTOMER_ID, now)
    expect(t.usedBy).toBe(CUSTOMER_ID)
    expect(t.usedAt).toBe(now)
    expect(t.isUsed()).toBe(true)
  })

  test('markUsed throws QrTokenAlreadyUsedError when already used', () => {
    const t = makeToken({ usedBy: CUSTOMER_ID, usedAt: GENERATED_AT })
    expect(() =>
      t.markUsed(CUSTOMER_ID, new Date('2026-05-14T11:00:00Z')),
    ).toThrow(QrTokenAlreadyUsedError)
  })

  test('markUsed throws QrTokenExpiredError when expired', () => {
    const t = makeToken()
    expect(() =>
      t.markUsed(CUSTOMER_ID, new Date('2026-05-16T00:00:00Z')),
    ).toThrow(QrTokenExpiredError)
  })

  test('markUsed prefers AlreadyUsed over Expired if both apply', () => {
    const t = makeToken({ usedBy: CUSTOMER_ID, usedAt: GENERATED_AT })
    expect(() =>
      t.markUsed(CUSTOMER_ID, new Date('2026-05-16T00:00:00Z')),
    ).toThrow(QrTokenAlreadyUsedError)
  })

  test('error codes are stable', () => {
    expect(new QrTokenExpiredError().code).toBe('QR_TOKEN_EXPIRED')
    expect(new QrTokenAlreadyUsedError().code).toBe('QR_TOKEN_ALREADY_USED')
  })
})
