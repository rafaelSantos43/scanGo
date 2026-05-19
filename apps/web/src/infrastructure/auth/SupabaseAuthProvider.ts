import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { EmailAlreadyRegisteredError } from '@/domain/errors/EmailAlreadyRegisteredError'
import { InvalidMagicLinkError } from '@/domain/errors/InvalidMagicLinkError'
import type { AuthProvider, AuthRole } from '@/domain/services/AuthProvider'
import { Email } from '@/domain/value-objects/Email'
import { UserId } from '@/domain/value-objects/ids'

export interface SupabaseAuthProviderConfig {
  url: string
  serviceRoleKey: string
  // Donde redirige el magic link tras el click (ej: https://scango.com/auth/callback)
  magicLinkRedirectUrl: string
}

export class SupabaseAuthProvider implements AuthProvider {
  private readonly client: SupabaseClient

  constructor(private readonly config: SupabaseAuthProviderConfig) {
    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async sendMagicLink(email: Email, role: AuthRole): Promise<void> {
    // `role` se serializa en `data` (user_metadata) y vuelve por
    // verifyMagicLink. El businessId NO viaja: para el admin se resuelve
    // tras verificar via BusinessAdminRepository.
    const { error } = await this.client.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: this.config.magicLinkRedirectUrl,
        data: { role },
      },
    })
    if (error) throw error
  }

  async verifyMagicLink(token: string): Promise<{
    userId: UserId
    role: AuthRole
    accessToken: string
    refreshToken: string
  } | null> {
    // En Supabase los magic links se verifican con verifyOtp tipo 'magiclink'.
    // El token aqui es el `token_hash` que viene en el query string del redirect.
    const { data, error } = await this.client.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    })
    if (error || !data.user || !data.session) return null
    const meta = data.user.user_metadata as { role?: AuthRole } | undefined
    if (!meta?.role) {
      throw new InvalidMagicLinkError()
    }
    return {
      userId: UserId(data.user.id),
      role: meta.role,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  }

  async createUserWithPassword(
    email: Email,
    password: string,
  ): Promise<UserId> {
    const { data, error } = await this.client.auth.admin.createUser({
      email: email.value,
      password,
      email_confirm: true,
    })
    if (error) {
      // Supabase devuelve un error con `status: 422` y un mensaje sobre
      // duplicate cuando el email ya esta tomado.
      if (
        typeof (error as { message?: unknown }).message === 'string' &&
        ((error as { message: string }).message
          .toLowerCase()
          .includes('already') ||
          (error as { message: string }).message
            .toLowerCase()
            .includes('exists'))
      ) {
        throw new EmailAlreadyRegisteredError(email.value)
      }
      throw error
    }
    return UserId(data.user.id)
  }

  async signInWithPassword(
    email: Email,
    password: string,
  ): Promise<UserId | null> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.value,
      password,
    })
    if (error || !data.user) return null
    return UserId(data.user.id)
  }

  async verifySession(sessionToken: string): Promise<UserId | null> {
    const { data, error } = await this.client.auth.getUser(sessionToken)
    if (error || !data.user) return null
    return UserId(data.user.id)
  }
}
