import { describe, expect, test } from 'bun:test'
import { Email } from '@/domain/value-objects/Email'
import { InvalidEmailError } from '@/domain/errors/InvalidEmailError'

describe('Email', () => {
  test('accepts a well-formed email', () => {
    const email = new Email('juan@gym.com')
    expect(email.value).toBe('juan@gym.com')
  })

  test('lowercases the input', () => {
    const email = new Email('Juan@Gym.COM')
    expect(email.value).toBe('juan@gym.com')
  })

  test('trims surrounding whitespace', () => {
    const email = new Email('  juan@gym.com  ')
    expect(email.value).toBe('juan@gym.com')
  })

  test('rejects an email without @', () => {
    expect(() => new Email('juangym.com')).toThrow(InvalidEmailError)
  })

  test('rejects an email without domain', () => {
    expect(() => new Email('juan@')).toThrow(InvalidEmailError)
  })

  test('rejects an email without TLD', () => {
    expect(() => new Email('juan@gym')).toThrow(InvalidEmailError)
  })

  test('rejects an empty string', () => {
    expect(() => new Email('')).toThrow(InvalidEmailError)
  })

  test('equals compares values', () => {
    const a = new Email('a@b.com')
    const b = new Email('A@B.COM')
    expect(a.equals(b)).toBe(true)
  })
})
