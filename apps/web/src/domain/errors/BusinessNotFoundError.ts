import { DomainError } from './DomainError'

export class BusinessNotFoundError extends DomainError {
  readonly code = 'BUSINESS_NOT_FOUND'

  constructor(businessId?: string) {
    super(
      businessId
        ? `Negocio ${businessId} no encontrado`
        : 'Negocio no encontrado',
    )
  }
}
