import { DomainError } from './DomainError'

export class CustomerNotFoundError extends DomainError {
  readonly code = 'CUSTOMER_NOT_FOUND'

  constructor(customerId?: string) {
    super(
      customerId
        ? `Cliente ${customerId} no encontrado`
        : 'Cliente no encontrado',
    )
  }
}
