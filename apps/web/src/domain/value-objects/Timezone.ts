import { InvalidTimezoneError } from '../errors/InvalidTimezoneError'

export class Timezone {
  readonly value: string

  constructor(raw: string) {
    if (!Timezone.isValid(raw)) {
      throw new InvalidTimezoneError(raw)
    }
    this.value = raw
  }

  private static isValid(raw: string): boolean {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: raw })
      return true
    } catch {
      return false
    }
  }

  equals(other: Timezone): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
