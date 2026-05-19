import { describe, expect, test } from 'bun:test'
import { ApiKey, type ApiKeyScope } from '@/domain/entities/ApiKey'
import { ApiKeyId, BusinessId } from '@/domain/value-objects/ids'

const API_KEY_ID = ApiKeyId('11111111-1111-1111-1111-111111111111')
const BUSINESS_ID = BusinessId('22222222-2222-2222-2222-222222222222')

function makeKey(opts?: {
  scope?: ApiKeyScope
  revokedAt?: Date | null
}): ApiKey {
  return new ApiKey({
    id: API_KEY_ID,
    businessId: BUSINESS_ID,
    hashedKey: 'argon2-hash',
    prefix: 'sg_abcdef0123',
    scope: opts?.scope ?? 'write',
    createdAt: new Date('2026-05-01T00:00:00Z'),
    revokedAt: opts?.revokedAt ?? null,
  })
}

describe('ApiKey', () => {
  test('isRevoked es false cuando revokedAt es null', () => {
    expect(makeKey().isRevoked()).toBe(false)
  })

  test('isRevoked es true cuando tiene fecha de revocación', () => {
    expect(makeKey({ revokedAt: new Date() }).isRevoked()).toBe(true)
  })

  test('revoke fija revokedAt y marca la key como revocada', () => {
    const k = makeKey()
    const at = new Date('2026-05-19T00:00:00Z')
    k.revoke(at)
    expect(k.isRevoked()).toBe(true)
    expect(k.revokedAt).toBe(at)
  })

  test('revoke es idempotente: conserva la primera fecha', () => {
    const first = new Date('2026-05-10T00:00:00Z')
    const k = makeKey({ revokedAt: first })
    k.revoke(new Date('2026-05-19T00:00:00Z'))
    expect(k.revokedAt).toBe(first)
  })

  describe('allows', () => {
    test('scope write autoriza write y read', () => {
      const k = makeKey({ scope: 'write' })
      expect(k.allows('write')).toBe(true)
      expect(k.allows('read')).toBe(true)
    })

    test('scope read autoriza read pero no write', () => {
      const k = makeKey({ scope: 'read' })
      expect(k.allows('read')).toBe(true)
      expect(k.allows('write')).toBe(false)
    })
  })
})
