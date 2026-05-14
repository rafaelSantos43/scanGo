import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { EmailAlreadyRegisteredError } from '@/domain/errors/EmailAlreadyRegisteredError'
import { InvalidMagicLinkError } from '@/domain/errors/InvalidMagicLinkError'
import type { AuthProvider } from '@/domain/services/AuthProvider'
import type { AuthContext } from '@/domain/value-objects/AuthContext'
import { Email } from '@/domain/value-objects/Email'
import { BusinessId, UserId } from '@/domain/value-objects/ids'

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

  async sendMagicLink(email: Email, context: AuthContext): Promise<void> {
    // El context se serializa en `data` y vuelve por verifyMagicLink.
    // Supabase lo expone via `user_metadata` o via query params en el redirect.
    const { error } = await this.client.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: this.config.magicLinkRedirectUrl,
        data: {
          businessId: context.businessId,
          role: context.role,
        },
      },
    })
    if (error) throw error
  }

  async verifyMagicLink(
    token: string,
  ): Promise<{ userId: UserId; context: AuthContext } | null> {
    // En Supabase los magic links se verifican con verifyOtp tipo 'magiclink'.
    // El token aqui es el `token_hash` que viene en el query string del redirect.
    const { data, error } = await this.client.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    })
    if (error || !data.user) return null
    const meta = data.user.user_metadata as
      | { businessId?: string; role?: 'admin' | 'customer' }
      | undefined
    if (!meta?.businessId || !meta.role) {
      throw new InvalidMagicLinkError()
    }
    return {
      userId: UserId(data.user.id),
      context: {
        businessId: BusinessId(meta.businessId),
        role: meta.role,
      },
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
