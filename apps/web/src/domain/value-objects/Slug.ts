import { InvalidSlugError } from '../errors/InvalidSlugError'

const SLUG_REGEX = /^[a-z0-9-]+$/

export class Slug {
  readonly value: string

  constructor(raw: string) {
    if (!SLUG_REGEX.test(raw)) {
      throw new InvalidSlugError(raw)
    }
    this.value = raw
  }

  equals(other: Slug): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
