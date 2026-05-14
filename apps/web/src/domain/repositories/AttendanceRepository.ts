import type { Attendance } from '../entities/Attendance'
import type { BusinessId, CustomerId } from '../value-objects/ids'

export interface AttendanceRepository {
  save(attendance: Attendance, businessId: BusinessId): Promise<void>

  /**
   * Devuelve la asistencia del cliente para la fecha indicada (en la
   * zona del negocio, formato YYYY-MM-DD), o null si no marco ese dia.
   *
   * Soporta idempotencia §9.2: un reintento del mismo dia retorna la
   * asistencia existente en vez de tirar AlreadyScannedTodayError.
   */
  findByCustomerAndDate(
    customerId: CustomerId,
    businessId: BusinessId,
    scannedDate: string,
  ): Promise<Attendance | null>
}
