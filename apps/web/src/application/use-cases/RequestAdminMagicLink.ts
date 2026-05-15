import type { AuthProvider } from '@/domain/services/AuthProvider'
import { Email } from '@/domain/value-objects/Email'

export interface RequestAdminMagicLinkInput {
  email: string
}

export interface RequestAdminMagicLinkResult {
  sent: true
}

/**
 * Envia un magic link de login al email indicado, marcado como rol
 * 'admin'. NO verifica que el email sea admin de un negocio: cualquier
 * email valido puede pedir un link (Supabase crea el usuario al vuelo).
 * El filtro real "es admin" ocurre en `VerifyAdminMagicLink`, tras el
 * click. Por eso la respuesta es neutral (no revela si el email existe).
 */
export class RequestAdminMagicLinkUseCase {
  constructor(private readonly auth: AuthProvider) {}

  async execute(
    input: RequestAdminMagicLinkInput,
  ): Promise<RequestAdminMagicLinkResult> {
    const email = new Email(input.email)
    await this.auth.sendMagicLink(email, 'admin')
    return { sent: true }
  }
}
