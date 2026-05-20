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
  CreateWebhookSubscriptionUseCase,
  type CreateWebhookSubscriptionInput,
  type CreateWebhookSubscriptionResult,
} from '@/application/use-cases/CreateWebhookSubscription'
import {
  RegisterBusinessUseCase,
  type RegisterBusinessInput,
  type RegisterBusinessResult,
} from '@/application/use-cases/RegisterBusiness'
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
  EnsureLocationQrUseCase,
  type EnsureLocationQrInput,
  type EnsureLocationQrResult,
} from '@/application/use-cases/EnsureLocationQr'
import {
  GenerateQrUseCase,
  type GenerateQrInput,
  type GenerateQrResult,
} from '@/application/use-cases/GenerateQr'
import {
  IssueApiKeyUseCase,
  type IssueApiKeyInput,
  type IssueApiKeyResult,
} from '@/application/use-cases/IssueApiKey'
import {
  ListApiKeysUseCase,
  type ListApiKeysInput,
  type ListApiKeysResult,
} from '@/application/use-cases/ListApiKeys'
import {
  RevokeApiKeyUseCase,
  type RevokeApiKeyInput,
  type RevokeApiKeyResult,
} from '@/application/use-cases/RevokeApiKey'
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
  RequestCustomerMagicLinkUseCase,
  type RequestCustomerMagicLinkInput,
  type RequestCustomerMagicLinkResult,
} from '@/application/use-cases/RequestCustomerMagicLink'
import {
  VerifyCustomerMagicLinkUseCase,
  type VerifyCustomerMagicLinkInput,
  type VerifyCustomerMagicLinkResult,
} from '@/application/use-cases/VerifyCustomerMagicLink'
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
import { ApiKeyRepositoryDrizzle } from './persistence/drizzle/ApiKeyRepositoryDrizzle'
import { QrTokenRepositoryDrizzle } from './persistence/drizzle/QrTokenRepositoryDrizzle'
import { WebhookDeliveryRepositoryDrizzle } from './persistence/drizzle/WebhookDeliveryRepositoryDrizzle'
import { WebhookSubscriptionRepositoryDrizzle } from './persistence/drizzle/WebhookSubscriptionRepositoryDrizzle'
import { HttpWebhookDispatcher } from './webhooks/HttpWebhookDispatcher'
import { Argon2ApiKeyHasher } from './auth/Argon2ApiKeyHasher'
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

export async function runEnsureLocationQr(
  input: EnsureLocationQrInput,
): Promise<EnsureLocationQrResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new EnsureLocationQrUseCase(
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

function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_APP_URL is not set')
  }
  // Sin slash final, para concatenar `/api/auth/...` predeciblemente.
  return url.replace(/\/$/, '')
}

export async function runRequestCustomerMagicLink(
  input: RequestCustomerMagicLinkInput,
): Promise<RequestCustomerMagicLinkResult> {
  const useCase = new RequestCustomerMagicLinkUseCase(
    new CustomerRepositoryDrizzle(getDb()),
    getAuthProvider(),
    getAppBaseUrl(),
  )
  return useCase.execute(input)
}

export async function runVerifyCustomerMagicLink(
  input: VerifyCustomerMagicLinkInput,
): Promise<VerifyCustomerMagicLinkResult> {
  const useCase = new VerifyCustomerMagicLinkUseCase(
    new CustomerRepositoryDrizzle(getDb()),
    getAuthProvider(),
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

export async function runListApiKeys(
  input: ListApiKeysInput,
): Promise<ListApiKeysResult> {
  const useCase = new ListApiKeysUseCase(new ApiKeyRepositoryDrizzle(getDb()))
  return useCase.execute(input)
}

// API keys. buildApiKeyRepository y buildApiKeyHasher los usa el middleware
// de auth (getBusinessAuthContext) para validar la key en cada request.
export function buildApiKeyRepository(): ApiKeyRepositoryDrizzle {
  return new ApiKeyRepositoryDrizzle(getDb())
}

export function buildApiKeyHasher(): Argon2ApiKeyHasher {
  return new Argon2ApiKeyHasher()
}

export async function runIssueApiKey(
  input: IssueApiKeyInput,
): Promise<IssueApiKeyResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new IssueApiKeyUseCase(
      new BusinessRepositoryDrizzle(tx),
      new ApiKeyRepositoryDrizzle(tx),
      new Argon2ApiKeyHasher(),
      new SystemClock(),
      new UuidGenerator(),
    )
    return useCase.execute(input)
  })
}

export async function runRevokeApiKey(
  input: RevokeApiKeyInput,
): Promise<RevokeApiKeyResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new RevokeApiKeyUseCase(
      new ApiKeyRepositoryDrizzle(tx),
      new SystemClock(),
    )
    return useCase.execute(input)
  })
}

// Onboarding del dueño de negocio (CU-01). Crea el business, el
// business_admin, y dispara el magic link. La parte de DB va en
// transacción; el findOrCreateUser + sendMagicLink son contra Supabase
// (fuera de la transacción por necesidad).
export async function runRegisterBusiness(
  input: RegisterBusinessInput,
): Promise<RegisterBusinessResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new RegisterBusinessUseCase(
      new BusinessRepositoryDrizzle(tx),
      new BusinessAdminRepositoryDrizzle(tx),
      getAuthProvider(),
      new SystemClock(),
      new UuidGenerator(),
    )
    return useCase.execute(input)
  })
}

export async function runCreateWebhookSubscription(
  input: CreateWebhookSubscriptionInput,
): Promise<CreateWebhookSubscriptionResult> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const useCase = new CreateWebhookSubscriptionUseCase(
      new BusinessRepositoryDrizzle(tx),
      new WebhookSubscriptionRepositoryDrizzle(tx),
      new SystemClock(),
      new UuidGenerator(),
    )
    return useCase.execute(input)
  })
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
