import { DomainError } from './DomainError'

export class CustomerDisabledError extends DomainError {
  readonly code = 'CUSTOMER_DISABLED'

  constructor(customerId?: string) {
    super(
      customerId
        ? `El cliente ${customerId} está deshabilitado`
        : 'El cliente está deshabilitado',
    )
  }
}
