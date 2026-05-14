import { DomainError } from './DomainError'

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED'

  constructor(email?: string) {
    super(
      email
        ? `El email ${email} ya está registrado`
        : 'El email ya está registrado',
    )
  }
}
