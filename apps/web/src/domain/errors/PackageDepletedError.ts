import { DomainError } from './DomainError'

export class PackageDepletedError extends DomainError {
  readonly code = 'PACKAGE_DEPLETED'

  constructor(packageId?: string) {
    super(
      packageId
        ? `El paquete ${packageId} está agotado`
        : 'El paquete está agotado',
    )
  }
}
