import { DomainError } from './DomainError'

export class CustomerAlreadyHasActivePackageError extends DomainError {
  readonly code = 'CUSTOMER_ALREADY_HAS_ACTIVE_PACKAGE'

  constructor(customerId: string) {
    super(`El cliente ${customerId} ya tiene un paquete activo`)
  }
}
