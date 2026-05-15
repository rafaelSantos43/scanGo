import { QrTokenAlreadyUsedError } from '../errors/QrTokenAlreadyUsedError'
import { QrTokenExpiredError } from '../errors/QrTokenExpiredError'
import type {
  BusinessId,
  CustomerId,
  LocationId,
  QrTokenValue,
} from '../value-objects/ids'

export interface QrTokenProps {
  token: QrTokenValue
  businessId: BusinessId
  locationId: LocationId
  generatedAt: Date
  expiresAt: Date
  usedBy: CustomerId | null
  usedAt: Date | null
}

export class QrToken {
  readonly token: QrTokenValue
  readonly businessId: BusinessId
  readonly locationId: LocationId
  readonly generatedAt: Date
  readonly expiresAt: Date
  private _usedBy: CustomerId | null
  private _usedAt: Date | null

  constructor(props: QrTokenProps) {
    this.token = props.token
    this.businessId = props.businessId
    this.locationId = props.locationId
    this.generatedAt = props.generatedAt
    this.expiresAt = props.expiresAt
    this._usedBy = props.usedBy
    this._usedAt = props.usedAt
  }

  get usedBy(): CustomerId | null {
    return this._usedBy
  }

  get usedAt(): Date | null {
    return this._usedAt
  }

  isUsed(): boolean {
    return this._usedBy !== null
  }

  isExpired(now: Date): boolean {
    return now.getTime() > this.expiresAt.getTime()
  }

  markUsed(customerId: CustomerId, now: Date): void {
    if (this.isUsed()) {
      throw new QrTokenAlreadyUsedError()
    }
    if (this.isExpired(now)) {
      throw new QrTokenExpiredError()
    }
    this._usedBy = customerId
    this._usedAt = now
  }
}
