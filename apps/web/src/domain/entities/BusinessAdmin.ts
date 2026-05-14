import type { BusinessId, UserId } from '../value-objects/ids'

export interface BusinessAdminProps {
  businessId: BusinessId
  userId: UserId
  createdAt: Date
}

// El admin es una relacion (businessId, userId), no una entidad con id propio.
// La PK compuesta refleja eso. Por consistencia con el resto del dominio,
// modelamos como clase con readonly fields (no method invariants — el dueno
// es simplemente el primer registro en business_admins per ARCHITECTURE §6
// decision 6).
export class BusinessAdmin {
  readonly businessId: BusinessId
  readonly userId: UserId
  readonly createdAt: Date

  constructor(props: BusinessAdminProps) {
    this.businessId = props.businessId
    this.userId = props.userId
    this.createdAt = props.createdAt
  }
}
