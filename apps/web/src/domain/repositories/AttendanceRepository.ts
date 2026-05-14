import type { Attendance } from '../entities/Attendance'
import type { BusinessId } from '../value-objects/ids'

export interface AttendanceRepository {
  save(attendance: Attendance, businessId: BusinessId): Promise<void>
}
