import { AttendanceRepositoryDrizzle } from './persistence/drizzle/AttendanceRepositoryDrizzle'
import { BusinessRepositoryDrizzle } from './persistence/drizzle/BusinessRepositoryDrizzle'
import { CustomerRepositoryDrizzle } from './persistence/drizzle/CustomerRepositoryDrizzle'
import { PackageRepositoryDrizzle } from './persistence/drizzle/PackageRepositoryDrizzle'
import { QrTokenRepositoryDrizzle } from './persistence/drizzle/QrTokenRepositoryDrizzle'
import { createDb, type Database } from './persistence/drizzle/client'

let _db: Database | null = null

function getDb(): Database {
  if (_db) return _db
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  _db = createDb(url)
  return _db
}

export function buildBusinessRepository(): BusinessRepositoryDrizzle {
  return new BusinessRepositoryDrizzle(getDb())
}

export function buildCustomerRepository(): CustomerRepositoryDrizzle {
  return new CustomerRepositoryDrizzle(getDb())
}

export function buildPackageRepository(): PackageRepositoryDrizzle {
  return new PackageRepositoryDrizzle(getDb())
}

export function buildQrTokenRepository(): QrTokenRepositoryDrizzle {
  return new QrTokenRepositoryDrizzle(getDb())
}

export function buildAttendanceRepository(): AttendanceRepositoryDrizzle {
  return new AttendanceRepositoryDrizzle(getDb())
}
