import { describe, expect, test } from 'bun:test'
import { Timezone } from '@/domain/value-objects/Timezone'
import { InvalidTimezoneError } from '@/domain/errors/InvalidTimezoneError'

describe('Timezone', () => {
  test('accepts America/Bogota', () => {
    expect(new Timezone('America/Bogota').value).toBe('America/Bogota')
  })

  test('accepts UTC', () => {
    expect(new Timezone('UTC').value).toBe('UTC')
  })

  test('accepts Europe/Madrid', () => {
    expect(new Timezone('Europe/Madrid').value).toBe('Europe/Madrid')
  })

  test('rejects gibberish', () => {
    expect(() => new Timezone('Not/A_Timezone')).toThrow(InvalidTimezoneError)
  })

  test('rejects empty string', () => {
    expect(() => new Timezone('')).toThrow(InvalidTimezoneError)
  })

  test('equals compares values', () => {
    expect(new Timezone('UTC').equals(new Timezone('UTC'))).toBe(true)
  })
})
