import { DomainError } from './DomainError'

export class InvalidVisitCountError extends DomainError {
  readonly code = 'INVALID_VISIT_COUNT'

  constructor(value: number) {
    super(`El paquete debe tener al menos 1 visita: recibido ${value}`)
  }
}
