import {
  AssignPackageUseCase,
  type AssignPackageInput,
  type AssignPackageResult,
} from '@/application/use-cases/AssignPackage'
import {
  CreateCustomerUseCase,
  type CreateCustomerInput,
  type CreateCustomerResult,
} from '@/application/use-cases/CreateCustomer'
import {
  GenerateQrUseCase,
  type GenerateQrInput,
  type GenerateQrResult,
} from '@/application/use-cases/GenerateQr'
import {
  RegisterAttendanceUseCase,
  type RegisterAttendanceInput,
  type RegisterAttendanceResult,
} from '@/application/use-cases/RegisterAttendance'
import { SupabaseAuthProvider } from './auth/SupabaseAuthProvider'
import { SystemClock } from './clock/SystemClock'
import { UuidGenerator } from './ids/UuidGenerator'
import { AttendanceRepositoryDrizzle } from './persistence/drizzle/AttendanceRepositoryDrizzle'
import { BusinessAdminRepositoryDrizzle } from './persistence/drizzle/BusinessAdminRepositoryDrizzle'
import { BusinessRepositoryDrizzle } from './persistence/drizzle/BusinessRepositoryDrizzle'
import { CustomerRepositoryDrizzle } from './persistence/drizzle/CustomerRepositoryDrizzle'
import { LocationRepositoryDrizzle } from './persistence/drizzle/LocationRepositoryDrizzle'
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

let _authProvider: SupabaseAuthProvider | null = null

function getAuthProvider(): SupabaseAuthProvider {
  if (_authProvider) return _authProvider
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const magicLinkRedirectUrl = process.env.SUPABASE_MAGIC_LINK_REDIRECT_URL
  if (!url || !serviceRoleKey || !magicLinkRedirectUrl) {
    throw new Error(
      'Supabase auth env vars not set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MAGIC_LINK_REDIRECT_URL)',
    )
  }
  _authProvider = new SupabaseAuthProvider({
    url,
    serviceRoleKey,
    magicLinkRedirectUrl,
  })
  return _authProvider
}

export function buildAuthProvider(): SupabaseAuthProvider {
  return getAuthProvider()
}

export function buildBusinessRepository(): BusinessRepositoryDrizzle {
  return new BusinessRepositoryDrizzle(getDb())
}

export function buildBusinessAdminRepository(): BusinessAdminRepositoryDrizzle {
  return new BusinessAdminRepositoryDrizzle(getDb())
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

export function buildLocationRepository(): LocationRepositoryDrizzle {
  return new LocationRepositoryDrizzle(getDb())
}

export async function runRegisterAttendance(
  input: RegisterAttendanceInput,
): Promise<RegisterAttendanceResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new RegisterAttendanceUseCase(
      new BusinessRepositoryDrizzle(tx),
      new CustomerRepositoryDrizzle(tx),
      new PackageRepositoryDrizzle(tx),
      new AttendanceRepositoryDrizzle(tx),
      new QrTokenRepositoryDrizzle(tx),
      new SystemClock(),
      new UuidGenerator(),
    )
    return useCase.execute(input)
  })
}

export async function runCreateCustomer(
  input: CreateCustomerInput,
): Promise<CreateCustomerResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new CreateCustomerUseCase(
      new BusinessRepositoryDrizzle(tx),
      new CustomerRepositoryDrizzle(tx),
      new SystemClock(),
      new UuidGenerator(),
    )
    return useCase.execute(input)
  })
}

export async function runAssignPackage(
  input: AssignPackageInput,
): Promise<AssignPackageResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new AssignPackageUseCase(
      new CustomerRepositoryDrizzle(tx),
      new PackageRepositoryDrizzle(tx),
      new SystemClock(),
      new UuidGenerator(),
    )
    return useCase.execute(input)
  })
}

export async function runGenerateQr(
  input: GenerateQrInput,
): Promise<GenerateQrResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new GenerateQrUseCase(
      new BusinessRepositoryDrizzle(tx),
      new LocationRepositoryDrizzle(tx),
      new QrTokenRepositoryDrizzle(tx),
      new SystemClock(),
      new UuidGenerator(),
    )
    return useCase.execute(input)
  })
}
