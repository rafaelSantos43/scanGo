import { InvalidIdError } from '../errors/InvalidIdError'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUuid(brand: string, raw: string): void {
  if (!UUID_REGEX.test(raw)) {
    throw new InvalidIdError(brand, raw)
  }
}

export type BusinessId = string & { readonly __brand: 'BusinessId' }
export const BusinessId = (raw: string): BusinessId => {
  assertUuid('BusinessId', raw)
  return raw as BusinessId
}

export type CustomerId = string & { readonly __brand: 'CustomerId' }
export const CustomerId = (raw: string): CustomerId => {
  assertUuid('CustomerId', raw)
  return raw as CustomerId
}

export type PackageId = string & { readonly __brand: 'PackageId' }
export const PackageId = (raw: string): PackageId => {
  assertUuid('PackageId', raw)
  return raw as PackageId
}

export type AttendanceId = string & { readonly __brand: 'AttendanceId' }
export const AttendanceId = (raw: string): AttendanceId => {
  assertUuid('AttendanceId', raw)
  return raw as AttendanceId
}

export type UserId = string & { readonly __brand: 'UserId' }
export const UserId = (raw: string): UserId => {
  assertUuid('UserId', raw)
  return raw as UserId
}

export type QrTokenValue = string & { readonly __brand: 'QrTokenValue' }
export const QrTokenValue = (raw: string): QrTokenValue => {
  assertUuid('QrTokenValue', raw)
  return raw as QrTokenValue
}
