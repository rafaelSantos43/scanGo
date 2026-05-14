import { DomainError } from './DomainError'

export class InvalidTimezoneError extends DomainError {
  readonly code = 'INVALID_TIMEZONE'

  constructor(raw: string) {
    super(`Timezone IANA inválida: "${raw}"`)
  }
}
