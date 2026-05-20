import type { UserId } from '../value-objects/ids'
import type { Email } from '../value-objects/Email'

export type AuthRole = 'admin' | 'customer'

/**
 * Puerto del dominio para el sistema de auth. La capa domain no conoce
 * a Supabase ni a ningun otro provider (ARCHITECTURE §8.4). El
 * SupabaseAuthProvider concreto vive en infrastructure/auth/.
 *
 * Para v1 cubre los flujos del PRD vía magic link:
 * - Admin del negocio (§8.1, RF-01).
 * - Cliente final (§8.2, RF-02).
 * - Sesion via cookie HttpOnly con el JWT de Supabase, validada
 *   server-side con `verifySession`.
 *
 * PRD RF-01 también permite password — no está cableado. Si se cablea,
 * `createUserWithPassword` y `signInWithPassword` se añaden aquí con un
 * consumidor real (use case + UI) en el mismo chunk.
 */
export interface AuthProvider {
  /**
   * Envia un magic link al email del usuario. `role` viaja en la
   * metadata del link para que `verifyMagicLink` lo recupere y el
   * caller pueda rechazar un link de customer usado en flujo de admin
   * (y viceversa). El `businessId` NO viaja aqui: para el admin se
   * resuelve tras verificar via `BusinessAdminRepository`; para el
   * customer, el caller pasa un `emailRedirectTo` que incluye el
   * `customer_id` en el query string para que el callback sepa cuál
   * fila de `customers` ligar al user de Supabase.
   */
  sendMagicLink(
    email: Email,
    role: AuthRole,
    options?: { emailRedirectTo?: string },
  ): Promise<void>

  /**
   * Verifica un magic link recibido. Devuelve el user resuelto, el
   * `role` que viajo en el link, el `accessToken` (JWT corto) y el
   * `refreshToken` (largo, rotativo) de la sesion recien creada — el
   * caller los guarda en cookies HttpOnly. Devuelve null si el token es
   * invalido o expiro.
   */
  verifyMagicLink(token: string): Promise<{
    userId: UserId
    role: AuthRole
    accessToken: string
    refreshToken: string
  } | null>

  /**
   * Valida un access token (JWT) de sesion y devuelve el UserId
   * asociado. Devuelve null si no hay sesion valida (expiro, revoked,
   * etc.). El context (businessId, role) NO viene aqui — se resuelve
   * aparte via BusinessAdminRepository o CustomerRepository.
   */
  verifySession(sessionToken: string): Promise<UserId | null>

  /**
   * Devuelve el UserId del usuario con ese email; lo crea en el
   * provider si todavía no existe. Lo usa `RegisterBusiness` (CU-01)
   * para tener un user.id antes de crear `business_admins` y enviarle
   * un magic link al dueño que aún no ha hecho click.
   *
   * `role` se persiste en metadata para que un `verifyMagicLink`
   * posterior pueda distinguir admin de customer.
   */
  findOrCreateUserByEmail(email: Email, role: AuthRole): Promise<UserId>
}
