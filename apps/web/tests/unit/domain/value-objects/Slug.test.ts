import { describe, expect, test } from 'bun:test'
import { Slug } from '@/domain/value-objects/Slug'
import { InvalidSlugError } from '@/domain/errors/InvalidSlugError'

describe('Slug', () => {
  test('accepts lowercase letters', () => {
    expect(new Slug('gym').value).toBe('gym')
  })

  test('accepts numbers and hyphens', () => {
    expect(new Slug('gym-maria-123').value).toBe('gym-maria-123')
  })

  test('rejects uppercase', () => {
    expect(() => new Slug('Gym-Maria')).toThrow(InvalidSlugError)
  })

  test('rejects spaces', () => {
    expect(() => new Slug('gym maria')).toThrow(InvalidSlugError)
  })

  test('rejects underscores', () => {
    expect(() => new Slug('gym_maria')).toThrow(InvalidSlugError)
  })

  test('rejects empty string', () => {
    expect(() => new Slug('')).toThrow(InvalidSlugError)
  })

  test('rejects accented characters', () => {
    expect(() => new Slug('gimnasio-maría')).toThrow(InvalidSlugError)
  })
})
