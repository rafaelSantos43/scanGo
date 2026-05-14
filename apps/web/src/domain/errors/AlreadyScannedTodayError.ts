import { DomainError } from './DomainError'

export class AlreadyScannedTodayError extends DomainError {
  readonly code = 'ALREADY_SCANNED_TODAY'

  constructor() {
    super('El cliente ya registró asistencia hoy')
  }
}
