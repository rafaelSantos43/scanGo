import type { UserId } from '../value-objects/ids'
import type { Email } from '../value-objects/Email'

export type AuthRole = 'admin' | 'customer'

/**
 * Puerto del dominio para el sistema de auth. La capa domain no conoce
 * a Supabase ni a ningun otro provider (ARCHITECTURE §8.4). El
 * SupabaseAuthProvider concreto vive en infrastructure/auth/.
 *
 * Para v1 cubre los flujos del PRD:
 * - Admin del negocio: email+password o magic link (§8.1, RF-01).
 * - Cliente final: magic link only (§8.2, RF-02).
 * - Sesion via cookie HttpOnly con el JWT de Supabase, validada
 *   server-side con `verifySession`.
 */
export interface AuthProvider {
  /**
   * Envia un magic link al email del usuario. `role` viaja en la
   * metadata del link para que `verifyMagicLink` lo recupere y el
   * caller pueda rechazar un link de customer usado en flujo de admin
   * (y viceversa). El `businessId` NO viaja aqui: para el admin se
   * resuelve tras verificar via `BusinessAdminRepository`.
   */
  sendMagicLink(email: Email, role: AuthRole): Promise<void>

  /**
   * Verifica un magic link recibido. Devuelve el user resuelto, el
   * `role` que viajo en el link y el `accessToken` (JWT de Supabase)
   * de la sesion recien creada — el caller lo guarda en la cookie
   * HttpOnly. Devuelve null si el token es invalido o expiro.
   */
  verifyMagicLink(token: string): Promise<{
    userId: UserId
    role: AuthRole
    accessToken: string
  } | null>

  /**
   * Crea un usuario nuevo con password (admin signup). Devuelve su UserId.
   * Si el email ya esta registrado, lanza el error correspondiente del
   * provider (el caller debera mapearlo a un domain error).
   */
  createUserWithPassword(email: Email, password: string): Promise<UserId>

  /**
   * Verifica email+password (admin login). Devuelve el UserId si las
   * credenciales son validas, o null si no.
   */
  signInWithPassword(email: Email, password: string): Promise<UserId | null>

  /**
   * Valida un access token (JWT) de sesion y devuelve el UserId
   * asociado. Devuelve null si no hay sesion valida (expiro, revoked,
   * etc.). El context (businessId, role) NO viene aqui — se resuelve
   * aparte via BusinessAdminRepository o CustomerRepository.
   */
  verifySession(sessionToken: string): Promise<UserId | null>
}
