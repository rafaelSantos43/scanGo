import { DomainError } from './DomainError'

export class ApiKeyNotFoundError extends DomainError {
  readonly code = 'API_KEY_NOT_FOUND'

  constructor(id?: string) {
    super(id ? `API key ${id} no encontrada` : 'API key no encontrada')
  }
}
