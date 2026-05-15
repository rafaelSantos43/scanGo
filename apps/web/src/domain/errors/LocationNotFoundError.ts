import { DomainError } from './DomainError'

export class LocationNotFoundError extends DomainError {
  readonly code = 'LOCATION_NOT_FOUND'

  constructor(locationId?: string) {
    super(
      locationId
        ? `Sede ${locationId} no encontrada`
        : 'Sede no encontrada',
    )
  }
}
