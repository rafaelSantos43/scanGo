import { DomainError } from './DomainError'

export class BusinessSlugAlreadyExistsError extends DomainError {
  readonly code = 'BUSINESS_SLUG_ALREADY_EXISTS'

  constructor(slug?: string) {
    super(
      slug
        ? `El identificador "${slug}" ya está tomado`
        : 'Ese identificador ya está tomado',
    )
  }
}
