import { NextResponse } from 'next/server'
import { InvalidMagicLinkError } from '@/domain/errors/InvalidMagicLinkError'
import { NotABusinessAdminError } from '@/domain/errors/NotABusinessAdminError'
import { runVerifyAdminMagicLink } from '@/infrastructure/composition'
import { applySessionCookies } from '../../_lib/sessionCookie'

/**
 * Callback del magic link. Es una navegacion del browser (GET), no una
 * llamada de API: en vez de JSON responde con redirects. El email
 * template de Supabase debe apuntar aqui con
 * `?token_hash={{.TokenHash}}&type=magiclink`.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  const redirectTo = (path: string): NextResponse =>
    NextResponse.redirect(new URL(path, req.url))

  if (!tokenHash || type !== 'magiclink') {
    return redirectTo('/login?error=invalid_link')
  }

  try {
    const result = await runVerifyAdminMagicLink({ token: tokenHash })
    const res = redirectTo('/dashboard')
    applySessionCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    })
    return res
  } catch (err) {
    if (err instanceof InvalidMagicLinkError) {
      return redirectTo('/login?error=expired')
    }
    if (err instanceof NotABusinessAdminError) {
      return redirectTo('/login?error=not_admin')
    }
    console.error('auth callback error', err)
    return redirectTo('/login?error=unknown')
  }
}
