import type { AuthContext } from '../value-objects/AuthContext'
import type { UserId } from '../value-objects/ids'
import type { Email } from '../value-objects/Email'

/**
 * Puerto del dominio para el sistema de auth. La capa domain no conoce
 * a Supabase ni a ningun otro provider (ARCHITECTURE §8.4). El
 * SupabaseAuthProvider concreto vive en infrastructure/auth/.
 *
 * Para v1 cubre los flujos del PRD:
 * - Admin del negocio: email+password o magic link (§8.1, RF-01).
 * - Cliente final: magic link only (§8.2, RF-02).
 * - Sesion via cookie HttpOnly con JWT, validada server-side.
 */
export interface AuthProvider {
  /**
   * Envia un magic link al email del usuario. El context se incluye en
   * el payload del link para que `verifyMagicLink` pueda recuperarlo.
   * Para el cliente final el context discrimina el negocio (un email
   * puede ser cliente en N negocios, §8.2 caso multi-business).
   */
  sendMagicLink(email: Email, context: AuthContext): Promise<void>

  /**
   * Verifica un magic link recibido y retorna el user resuelto + el
   * context que se incluyo al enviarlo. Devuelve null si el token es
   * invalido o expiro.
   */
  verifyMagicLink(
    token: string,
  ): Promise<{ userId: UserId; context: AuthContext } | null>

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
   * Valida una cookie/JWT de sesion y devuelve el UserId asociado.
   * Devuelve null si no hay sesion valida (expiro, revoked, etc.).
   * El context (businessId, role) NO viene aqui — se resuelve aparte
   * via BusinessAdminRepository o CustomerRepository segun el rol.
   */
  verifySession(sessionToken: string): Promise<UserId | null>
}
