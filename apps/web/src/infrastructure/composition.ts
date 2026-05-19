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
  DeliverWebhookUseCase,
  type DeliverWebhookResult,
} from '@/application/use-cases/DeliverWebhook'
import {
  DisableCustomerUseCase,
  type DisableCustomerInput,
  type DisableCustomerResult,
} from '@/application/use-cases/DisableCustomer'
import {
  EnableCustomerUseCase,
  type EnableCustomerInput,
  type EnableCustomerResult,
} from '@/application/use-cases/EnableCustomer'
import {
  GenerateQrUseCase,
  type GenerateQrInput,
  type GenerateQrResult,
} from '@/application/use-cases/GenerateQr'
import {
  UpdateCustomerUseCase,
  type UpdateCustomerInput,
  type UpdateCustomerResult,
} from '@/application/use-cases/UpdateCustomer'
import {
  ListCustomersWithPackageUseCase,
  type ListCustomersWithPackageInput,
  type ListCustomersWithPackageResult,
} from '@/application/use-cases/ListCustomersWithPackage'
import {
  ListTodayAttendancesUseCase,
  type ListTodayAttendancesInput,
  type ListTodayAttendancesResult,
} from '@/application/use-cases/ListTodayAttendances'
import {
  RegisterAttendanceUseCase,
  type RegisterAttendanceInput,
  type RegisterAttendanceResult,
} from '@/application/use-cases/RegisterAttendance'
import {
  RequestAdminMagicLinkUseCase,
  type RequestAdminMagicLinkInput,
  type RequestAdminMagicLinkResult,
} from '@/application/use-cases/RequestAdminMagicLink'
import {
  VerifyAdminMagicLinkUseCase,
  type VerifyAdminMagicLinkInput,
  type VerifyAdminMagicLinkResult,
} from '@/application/use-cases/VerifyAdminMagicLink'
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
import { WebhookDeliveryRepositoryDrizzle } from './persistence/drizzle/WebhookDeliveryRepositoryDrizzle'
import { WebhookSubscriptionRepositoryDrizzle } from './persistence/drizzle/WebhookSubscriptionRepositoryDrizzle'
import { HttpWebhookDispatcher } from './webhooks/HttpWebhookDispatcher'
import { createDb, type Database } from './persistence/drizzle/client'

// El cliente de DB se cachea en globalThis, no en una variable de modulo:
// en dev el HMR de Next re-evalua este modulo en cada recarga y un
// singleton de modulo se perderia, filtrando un pool de postgres-js nuevo
// por recarga hasta agotar el pooler de Supabase.
const globalForDb = globalThis as typeof globalThis & {
  __scangoDb?: Database
}

function getDb(): Database {
  if (globalForDb.__scangoDb) return globalForDb.__scangoDb
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  globalForDb.__scangoDb = createDb(url)
  return globalForDb.__scangoDb
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
      new WebhookSubscriptionRepositoryDrizzle(tx),
      new WebhookDeliveryRepositoryDrizzle(tx),
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

export async function runUpdateCustomer(
  input: UpdateCustomerInput,
): Promise<UpdateCustomerResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new UpdateCustomerUseCase(new CustomerRepositoryDrizzle(tx))
    return useCase.execute(input)
  })
}

export async function runDisableCustomer(
  input: DisableCustomerInput,
): Promise<DisableCustomerResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new DisableCustomerUseCase(new CustomerRepositoryDrizzle(tx))
    return useCase.execute(input)
  })
}

export async function runEnableCustomer(
  input: EnableCustomerInput,
): Promise<EnableCustomerResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new EnableCustomerUseCase(new CustomerRepositoryDrizzle(tx))
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

// Use cases de auth: sin transaccion — RequestAdminMagicLink no toca la DB
// y VerifyAdminMagicLink solo hace lecturas.
export async function runRequestAdminMagicLink(
  input: RequestAdminMagicLinkInput,
): Promise<RequestAdminMagicLinkResult> {
  const useCase = new RequestAdminMagicLinkUseCase(getAuthProvider())
  return useCase.execute(input)
}

export async function runVerifyAdminMagicLink(
  input: VerifyAdminMagicLinkInput,
): Promise<VerifyAdminMagicLinkResult> {
  const useCase = new VerifyAdminMagicLinkUseCase(
    getAuthProvider(),
    new BusinessAdminRepositoryDrizzle(getDb()),
  )
  return useCase.execute(input)
}

// Listados del dashboard: solo lecturas, sin transaccion.
export async function runListTodayAttendances(
  input: ListTodayAttendancesInput,
): Promise<ListTodayAttendancesResult> {
  const db = getDb()
  const useCase = new ListTodayAttendancesUseCase(
    new BusinessRepositoryDrizzle(db),
    new AttendanceRepositoryDrizzle(db),
    new SystemClock(),
  )
  return useCase.execute(input)
}

export async function runListCustomersWithPackage(
  input: ListCustomersWithPackageInput,
): Promise<ListCustomersWithPackageResult> {
  const useCase = new ListCustomersWithPackageUseCase(
    new CustomerRepositoryDrizzle(getDb()),
  )
  return useCase.execute(input)
}

// Cron de entrega de webhooks: SIN transaccion — hace HTTP por cada
// delivery y mantener una transaccion abierta durante esos POST seria un
// anti-patron. Cada update del repo es su propio statement.
export async function runDeliverWebhook(): Promise<DeliverWebhookResult> {
  const db = getDb()
  const useCase = new DeliverWebhookUseCase(
    new WebhookDeliveryRepositoryDrizzle(db),
    new WebhookSubscriptionRepositoryDrizzle(db),
    new HttpWebhookDispatcher(),
    new SystemClock(),
  )
  return useCase.execute()
}
