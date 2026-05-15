import { Attendance } from '@/domain/entities/Attendance'
import {
  AttendanceId,
  BusinessId,
  CustomerId,
  LocationId,
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
      locationId: LocationId(row.locationId),
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
      locationId: entity.locationId,
      packageId: entity.packageId,
      qrToken: entity.qrToken,
      scannedAt: entity.scannedAt,
      scannedDate: entity.scannedDate,
    }
  }
}
