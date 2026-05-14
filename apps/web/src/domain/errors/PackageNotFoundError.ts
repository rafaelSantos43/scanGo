import { DomainError } from './DomainError'

export class PackageNotFoundError extends DomainError {
  readonly code = 'PACKAGE_NOT_FOUND'

  constructor(packageId?: string) {
    super(
      packageId
        ? `Paquete ${packageId} no encontrado`
        : 'Paquete no encontrado',
    )
  }
}
