import type { Attendance } from '@/domain/entities/Attendance'
import type { AttendanceRepository } from '@/domain/repositories/AttendanceRepository'
import { AlreadyScannedTodayError } from '@/domain/errors/AlreadyScannedTodayError'
import type { BusinessId } from '@/domain/value-objects/ids'
import type { DbOrTx } from './client'
import { AttendanceMapper } from './mappers/AttendanceMapper'
import { attendances } from './schema'
import { isUniqueViolation } from './_lib/pgErrors'

const DOUBLE_SCAN_CONSTRAINT = 'attendances_no_double_scan_per_day'

export class AttendanceRepositoryDrizzle implements AttendanceRepository {
  constructor(private readonly db: DbOrTx) {}

  async save(attendance: Attendance, businessId: BusinessId): Promise<void> {
    if (attendance.businessId !== businessId) {
      throw new Error(
        'Attendance businessId does not match expected businessId',
      )
    }
    const row = AttendanceMapper.toPersistence(attendance)
    try {
      await this.db.insert(attendances).values(row)
    } catch (err) {
      if (isUniqueViolation(err, DOUBLE_SCAN_CONSTRAINT)) {
        throw new AlreadyScannedTodayError()
      }
      throw err
    }
  }
}
