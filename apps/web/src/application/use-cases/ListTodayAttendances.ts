import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import type {
  AttendanceListItem,
  AttendanceRepository,
} from '@/domain/repositories/AttendanceRepository'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { Clock } from '@/domain/services/Clock'
import type { BusinessId } from '@/domain/value-objects/ids'
import { formatDateInTimezone } from './_lib/formatDateInTimezone'

export interface ListTodayAttendancesInput {
  businessId: BusinessId
}

export interface ListTodayAttendancesResult {
  /** Fecha de "hoy" resuelta en la zona del negocio (YYYY-MM-DD). */
  date: string
  /** Zona del negocio (IANA) — la UI formatea las horas con ella. */
  timezone: string
  attendances: AttendanceListItem[]
}

/**
 * Lista las asistencias de hoy de un negocio para el dashboard. "Hoy" se
 * calcula en la zona del negocio, no en la del servidor.
 */
export class ListTodayAttendancesUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly attendances: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: ListTodayAttendancesInput,
  ): Promise<ListTodayAttendancesResult> {
    const business = await this.businesses.findById(
      input.businessId,
      input.businessId,
    )
    if (!business) throw new BusinessNotFoundError(input.businessId)

    const today = formatDateInTimezone(this.clock.now(), business.timezone)
    const attendances = await this.attendances.listByBusinessAndDate(
      input.businessId,
      today,
    )
    return { date: today, timezone: business.timezone.value, attendances }
  }
}
