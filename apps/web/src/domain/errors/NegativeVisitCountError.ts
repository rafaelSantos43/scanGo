import { DomainError } from './DomainError'

export class NegativeVisitCountError extends DomainError {
  readonly code = 'NEGATIVE_VISIT_COUNT'

  constructor(value: number) {
    super(`VisitCount no puede ser negativo: recibido ${value}`)
  }
}
