import type { Attendance } from '../entities/Attendance'
import type { BusinessId, CustomerId } from '../value-objects/ids'

/**
 * Read-model plano para listar asistencias en el dashboard. No es una
 * entidad de dominio: es una fila lista para mostrar (cross-aggregate,
 * con el nombre del cliente y de la sede ya resueltos por JOIN).
 */
export interface AttendanceListItem {
  attendanceId: string
  customerId: string
  customerFullName: string
  locationId: string
  locationName: string
  scannedAt: Date
}

export interface AttendanceRepository {
  save(attendance: Attendance, businessId: BusinessId): Promise<void>

  /**
   * Lista las asistencias de un negocio para una fecha (YYYY-MM-DD en la
   * zona del negocio), ordenadas por `scannedAt` descendente. Para el
   * dashboard del negocio.
   */
  listByBusinessAndDate(
    businessId: BusinessId,
    scannedDate: string,
  ): Promise<AttendanceListItem[]>

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
