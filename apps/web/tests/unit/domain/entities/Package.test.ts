import { describe, expect, test } from 'bun:test'
import { Package } from '@/domain/entities/Package'
import { PackageDepletedError } from '@/domain/errors/PackageDepletedError'
import { VisitCount } from '@/domain/value-objects/VisitCount'
import {
  BusinessId,
  CustomerId,
  PackageId,
} from '@/domain/value-objects/ids'

const PKG_ID = PackageId('11111111-1111-1111-1111-111111111111')
const CUSTOMER_ID = CustomerId('22222222-2222-2222-2222-222222222222')
const BUSINESS_ID = BusinessId('33333333-3333-3333-3333-333333333333')

function makePackage(remaining: number, total = 15): Package {
  return new Package({
    id: PKG_ID,
    customerId: CUSTOMER_ID,
    businessId: BUSINESS_ID,
    totalVisits: new VisitCount(total),
    remainingVisits: new VisitCount(remaining),
    status: remaining === 0 ? 'depleted' : 'active',
    purchasedAt: new Date('2026-05-01T00:00:00Z'),
    expiresAt: null,
  })
}

describe('Package', () => {
  test('constructor stores all props', () => {
    const pkg = makePackage(15)
    expect(pkg.id).toBe(PKG_ID)
    expect(pkg.customerId).toBe(CUSTOMER_ID)
    expect(pkg.businessId).toBe(BUSINESS_ID)
    expect(pkg.totalVisits.value).toBe(15)
    expect(pkg.remainingVisits.value).toBe(15)
    expect(pkg.status).toBe('active')
  })

  test('decrement reduces remainingVisits by 1', () => {
    const pkg = makePackage(15)
    pkg.decrement()
    expect(pkg.remainingVisits.value).toBe(14)
    expect(pkg.status).toBe('active')
  })

  test('decrement that brings remaining to 0 flips status to depleted', () => {
    const pkg = makePackage(1)
    pkg.decrement()
    expect(pkg.remainingVisits.value).toBe(0)
    expect(pkg.status).toBe('depleted')
  })

  test('decrement on a depleted package throws PackageDepletedError', () => {
    const pkg = makePackage(0)
    expect(() => pkg.decrement()).toThrow(PackageDepletedError)
  })

  test('PackageDepletedError carries the package id and correct code', () => {
    const pkg = makePackage(0)
    try {
      pkg.decrement()
    } catch (err) {
      expect(err).toBeInstanceOf(PackageDepletedError)
      expect((err as PackageDepletedError).code).toBe('PACKAGE_DEPLETED')
    }
  })

  test('multiple decrements are independent', () => {
    const pkg = makePackage(3)
    pkg.decrement()
    pkg.decrement()
    expect(pkg.remainingVisits.value).toBe(1)
    expect(pkg.status).toBe('active')
    pkg.decrement()
    expect(pkg.remainingVisits.value).toBe(0)
    expect(pkg.status).toBe('depleted')
    expect(() => pkg.decrement()).toThrow(PackageDepletedError)
  })
})
