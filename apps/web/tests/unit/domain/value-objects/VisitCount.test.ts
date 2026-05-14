import { describe, expect, test } from 'bun:test'
import { VisitCount } from '@/domain/value-objects/VisitCount'
import { NegativeVisitCountError } from '@/domain/errors/NegativeVisitCountError'

describe('VisitCount', () => {
  test('accepts zero', () => {
    expect(new VisitCount(0).value).toBe(0)
  })

  test('accepts a positive integer', () => {
    expect(new VisitCount(15).value).toBe(15)
  })

  test('rejects a negative integer', () => {
    expect(() => new VisitCount(-1)).toThrow(NegativeVisitCountError)
  })

  test('rejects a non-integer', () => {
    expect(() => new VisitCount(1.5)).toThrow(NegativeVisitCountError)
  })

  test('rejects NaN', () => {
    expect(() => new VisitCount(Number.NaN)).toThrow(NegativeVisitCountError)
  })

  test('isZero true when value is 0', () => {
    expect(new VisitCount(0).isZero()).toBe(true)
  })

  test('isZero false when value is positive', () => {
    expect(new VisitCount(3).isZero()).toBe(false)
  })

  test('equals compares values', () => {
    expect(new VisitCount(10).equals(new VisitCount(10))).toBe(true)
    expect(new VisitCount(10).equals(new VisitCount(11))).toBe(false)
  })
})
