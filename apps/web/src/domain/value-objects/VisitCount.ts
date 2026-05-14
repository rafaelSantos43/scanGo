import { NegativeVisitCountError } from '../errors/NegativeVisitCountError'

export class VisitCount {
  readonly value: number

  constructor(value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new NegativeVisitCountError(value)
    }
    this.value = value
  }

  equals(other: VisitCount): boolean {
    return this.value === other.value
  }

  isZero(): boolean {
    return this.value === 0
  }
}
