import { PackageDepletedError } from '../errors/PackageDepletedError'
import { VisitCount } from '../value-objects/VisitCount'
import type { BusinessId, CustomerId, PackageId } from '../value-objects/ids'

export type PackageStatus = 'active' | 'depleted' | 'expired'

export interface PackageProps {
  id: PackageId
  customerId: CustomerId
  businessId: BusinessId
  totalVisits: VisitCount
  remainingVisits: VisitCount
  status: PackageStatus
  purchasedAt: Date
  expiresAt: Date | null
}

export class Package {
  readonly id: PackageId
  readonly customerId: CustomerId
  readonly businessId: BusinessId
  readonly totalVisits: VisitCount
  private _remainingVisits: VisitCount
  private _status: PackageStatus
  readonly purchasedAt: Date
  readonly expiresAt: Date | null

  constructor(props: PackageProps) {
    this.id = props.id
    this.customerId = props.customerId
    this.businessId = props.businessId
    this.totalVisits = props.totalVisits
    this._remainingVisits = props.remainingVisits
    this._status = props.status
    this.purchasedAt = props.purchasedAt
    this.expiresAt = props.expiresAt
  }

  get remainingVisits(): VisitCount {
    return this._remainingVisits
  }

  get status(): PackageStatus {
    return this._status
  }

  decrement(): void {
    if (this._remainingVisits.isZero()) {
      throw new PackageDepletedError(this.id)
    }
    this._remainingVisits = new VisitCount(this._remainingVisits.value - 1)
    if (this._remainingVisits.isZero()) {
      this._status = 'depleted'
    }
  }
}
