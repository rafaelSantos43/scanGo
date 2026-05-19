import type { Email } from '../value-objects/Email'
import type { BusinessId, CustomerId, UserId } from '../value-objects/ids'

export type CustomerStatus = 'active' | 'disabled'

export interface CustomerProps {
  id: CustomerId
  businessId: BusinessId
  userId: UserId | null
  fullName: string
  email: Email
  phone: string | null
  status: CustomerStatus
  createdAt: Date
}

export class Customer {
  readonly id: CustomerId
  readonly businessId: BusinessId
  readonly userId: UserId | null
  readonly fullName: string
  readonly email: Email
  readonly phone: string | null
  private _status: CustomerStatus
  readonly createdAt: Date

  constructor(props: CustomerProps) {
    this.id = props.id
    this.businessId = props.businessId
    this.userId = props.userId
    this.fullName = props.fullName
    this.email = props.email
    this.phone = props.phone
    this._status = props.status
    this.createdAt = props.createdAt
  }

  get status(): CustomerStatus {
    return this._status
  }

  isActive(): boolean {
    return this._status === 'active'
  }

  disable(): void {
    this._status = 'disabled'
  }

  enable(): void {
    this._status = 'active'
  }
}
