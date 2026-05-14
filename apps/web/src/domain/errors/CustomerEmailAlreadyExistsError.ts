import { DomainError } from './DomainError'

export class CustomerEmailAlreadyExistsError extends DomainError {
  readonly code = 'CUSTOMER_EMAIL_ALREADY_EXISTS'

  constructor(email: string) {
    super(`Ya existe un cliente con ese email en este negocio: ${email}`)
  }
}
