import type {
  AttendanceId,
  BusinessId,
  CustomerId,
  PackageId,
  QrTokenValue,
} from '../value-objects/ids'

export interface AttendanceProps {
  id: AttendanceId
  customerId: CustomerId
  businessId: BusinessId
  packageId: PackageId
  qrToken: QrTokenValue
  scannedAt: Date
  scannedDate: string
}

export class Attendance {
  readonly id: AttendanceId
  readonly customerId: CustomerId
  readonly businessId: BusinessId
  readonly packageId: PackageId
  readonly qrToken: QrTokenValue
  readonly scannedAt: Date
  readonly scannedDate: string

  constructor(props: AttendanceProps) {
    this.id = props.id
    this.customerId = props.customerId
    this.businessId = props.businessId
    this.packageId = props.packageId
    this.qrToken = props.qrToken
    this.scannedAt = props.scannedAt
    this.scannedDate = props.scannedDate
  }
}
