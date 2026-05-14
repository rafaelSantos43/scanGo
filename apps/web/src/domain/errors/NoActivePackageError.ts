import { DomainError } from './DomainError'

export class NoActivePackageError extends DomainError {
  readonly code = 'NO_ACTIVE_PACKAGE'
  readonly customerId?: string

  constructor(customerId?: string) {
    super('El cliente no tiene un paquete activo')
    this.customerId = customerId
  }
}
