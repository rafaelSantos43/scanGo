import { Business, type BusinessType } from '@/domain/entities/Business'
import { BusinessAdmin } from '@/domain/entities/BusinessAdmin'
import type { BusinessAdminRepository } from '@/domain/repositories/BusinessAdminRepository'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { AuthProvider } from '@/domain/services/AuthProvider'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import { Email } from '@/domain/value-objects/Email'
import { Slug } from '@/domain/value-objects/Slug'
import { Timezone } from '@/domain/value-objects/Timezone'
import { BusinessId } from '@/domain/value-objects/ids'

export interface RegisterBusinessInput {
  ownerEmail: string
  businessName: string
  businessSlug: string
  businessType: BusinessType
  timezone: string
}

export interface RegisterBusinessResult {
  business: Business
}

/**
 * Onboarding del dueño de negocio (CU-01). Crea el `business`, lo liga
 * a un user de Supabase (que se crea si no existe), y dispara el magic
 * link al email del dueño. El dueño hace click → callback admin
 * verifica → cae al dashboard, ya autenticado de su negocio.
 *
 * NO usa transacción atómica entre Supabase + DB porque son sistemas
 * distintos. Orden: primero creamos el user (idempotente: si ya existe,
 * lo reusamos), después el business y business_admin en transacción de
 * DB, y al final mandamos el magic link. Si el último paso falla, el
 * negocio queda creado y el admin puede reintentar el login con magic
 * link normal — no es un estado inválido.
 */
export class RegisterBusinessUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly businessAdmins: BusinessAdminRepository,
    private readonly auth: AuthProvider,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    input: RegisterBusinessInput,
  ): Promise<RegisterBusinessResult> {
    // Validación temprana de VOs (lanzan domain errors específicos si
    // el input está mal: Email, Slug, Timezone).
    const email = new Email(input.ownerEmail)
    const slug = new Slug(input.businessSlug)
    const timezone = new Timezone(input.timezone)

    const userId = await this.auth.findOrCreateUserByEmail(email, 'admin')

    const now = this.clock.now()
    const businessId = BusinessId(this.ids.uuid())
    const business = new Business({
      id: businessId,
      slug,
      name: input.businessName.trim(),
      type: input.businessType,
      timezone,
      createdAt: now,
    })
    // Si el slug colisiona, save lanza BusinessSlugAlreadyExistsError —
    // el caller lo mapea a un mensaje específico.
    await this.businesses.save(business, businessId)

    const admin = new BusinessAdmin({
      businessId,
      userId,
      createdAt: now,
    })
    await this.businessAdmins.save(admin, businessId)

    // Magic link al final: si falla, el negocio queda creado y el admin
    // puede pedir el link luego desde /login.
    await this.auth.sendMagicLink(email, 'admin')

    return { business }
  }
}
