import { Attendance } from '@/domain/entities/Attendance'
import {
  AttendanceId,
  BusinessId,
  CustomerId,
  PackageId,
  QrTokenValue,
} from '@/domain/value-objects/ids'
import type { attendances } from '../schema'

type AttendanceRow = typeof attendances.$inferSelect
type AttendanceInsert = typeof attendances.$inferInsert

export class AttendanceMapper {
  static toDomain(row: AttendanceRow): Attendance {
    return new Attendance({
      id: AttendanceId(row.id),
      customerId: CustomerId(row.customerId),
      businessId: BusinessId(row.businessId),
      packageId: PackageId(row.packageId),
      qrToken: QrTokenValue(row.qrToken),
      scannedAt: row.scannedAt,
      scannedDate: row.scannedDate,
    })
  }

  static toPersistence(entity: Attendance): AttendanceInsert {
    return {
      id: entity.id,
      customerId: entity.customerId,
      businessId: entity.businessId,
      packageId: entity.packageId,
      qrToken: entity.qrToken,
      scannedAt: entity.scannedAt,
      scannedDate: entity.scannedDate,
    }
  }
}
