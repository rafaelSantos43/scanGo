import { DomainError } from './DomainError'

export class InvalidIdError extends DomainError {
  readonly code = 'INVALID_ID'

  constructor(brand: string, raw: string) {
    super(`${brand} inválido: "${raw}" no es un UUID`)
  }
}
