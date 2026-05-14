import { describe, expect, test } from 'bun:test'
import {
  AttendanceId,
  BusinessId,
  CustomerId,
  PackageId,
  QrTokenValue,
  UserId,
} from '@/domain/value-objects/ids'
import { InvalidIdError } from '@/domain/errors/InvalidIdError'

const VALID = '550e8400-e29b-41d4-a716-446655440000'

describe('branded ID value objects', () => {
  test('BusinessId accepts a valid UUID', () => {
    expect(BusinessId(VALID)).toBe(VALID as ReturnType<typeof BusinessId>)
  })

  test('BusinessId rejects a non-UUID string', () => {
    expect(() => BusinessId('not-a-uuid')).toThrow(InvalidIdError)
  })

  test('CustomerId accepts a valid UUID', () => {
    expect(CustomerId(VALID)).toBe(VALID as ReturnType<typeof CustomerId>)
  })

  test('CustomerId rejects empty string', () => {
    expect(() => CustomerId('')).toThrow(InvalidIdError)
  })

  test('PackageId rejects malformed UUID', () => {
    expect(() => PackageId('550e8400-e29b-41d4-a716')).toThrow(InvalidIdError)
  })

  test('AttendanceId accepts uppercase UUID', () => {
    const upper = VALID.toUpperCase()
    expect(AttendanceId(upper)).toBe(upper as ReturnType<typeof AttendanceId>)
  })

  test('UserId rejects whitespace around UUID', () => {
    expect(() => UserId(` ${VALID} `)).toThrow(InvalidIdError)
  })

  test('QrTokenValue accepts a valid UUID', () => {
    expect(QrTokenValue(VALID)).toBe(VALID as ReturnType<typeof QrTokenValue>)
  })

  test('InvalidIdError carries code INVALID_ID', () => {
    try {
      BusinessId('xxx')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidIdError)
      expect((err as InvalidIdError).code).toBe('INVALID_ID')
    }
  })
})
