import { InvalidEmailError } from '../errors/InvalidEmailError'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Email {
  readonly value: string

  constructor(raw: string) {
    const trimmed = raw.trim().toLowerCase()
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new InvalidEmailError(raw)
    }
    this.value = trimmed
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
