import type {
  AttendanceId,
  BusinessId,
  CustomerId,
  LocationId,
  PackageId,
  QrTokenValue,
} from '../value-objects/ids'

export interface AttendanceProps {
  id: AttendanceId
  customerId: CustomerId
  businessId: BusinessId
  locationId: LocationId
  packageId: PackageId
  qrToken: QrTokenValue
  scannedAt: Date
  scannedDate: string
}

export class Attendance {
  readonly id: AttendanceId
  readonly customerId: CustomerId
  readonly businessId: BusinessId
  readonly locationId: LocationId
  readonly packageId: PackageId
  readonly qrToken: QrTokenValue
  readonly scannedAt: Date
  readonly scannedDate: string

  constructor(props: AttendanceProps) {
    this.id = props.id
    this.customerId = props.customerId
    this.businessId = props.businessId
    this.locationId = props.locationId
    this.packageId = props.packageId
    this.qrToken = props.qrToken
    this.scannedAt = props.scannedAt
    this.scannedDate = props.scannedDate
  }
}
