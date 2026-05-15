import type { BusinessId, LocationId } from '../value-objects/ids'

export interface LocationProps {
  id: LocationId
  businessId: BusinessId
  name: string
  createdAt: Date
}

/**
 * Sede física de un negocio. Un `Business` (la empresa, el tenant) tiene
 * una o más `Location`. `Customer` y `Package` se quedan a nivel
 * `Business` — el cliente entrena en cualquier sede con su mismo paquete.
 * `Attendance` y `QrToken` sí registran en qué sede ocurren.
 */
export class Location {
  readonly id: LocationId
  readonly businessId: BusinessId
  readonly name: string
  readonly createdAt: Date

  constructor(props: LocationProps) {
    this.id = props.id
    this.businessId = props.businessId
    this.name = props.name
    this.createdAt = props.createdAt
  }
}
