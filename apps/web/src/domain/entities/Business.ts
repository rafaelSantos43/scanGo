import type { BusinessId } from '../value-objects/ids'
import type { Slug } from '../value-objects/Slug'
import type { Timezone } from '../value-objects/Timezone'

export type BusinessType = 'gym' | 'academy' | 'coworking' | 'other'

export interface BusinessProps {
  id: BusinessId
  slug: Slug
  name: string
  type: BusinessType
  timezone: Timezone
  createdAt: Date
}

export class Business {
  readonly id: BusinessId
  readonly slug: Slug
  readonly name: string
  readonly type: BusinessType
  readonly timezone: Timezone
  readonly createdAt: Date

  constructor(props: BusinessProps) {
    this.id = props.id
    this.slug = props.slug
    this.name = props.name
    this.type = props.type
    this.timezone = props.timezone
    this.createdAt = props.createdAt
  }
}
