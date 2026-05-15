import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

/**
 * Cookie de sesion del admin. Guarda el access_token (JWT) de Supabase.
 * HttpOnly: el JWT nunca es accesible desde JS (protege de XSS).
 * Las mutaciones (set/clear) se aplican sobre un `NextResponse` para que
 * compongan de forma predecible con redirects; la lectura usa `cookies()`.
 */
export const SESSION_COOKIE_NAME = 'sg_admin_session'

// ~1h, alineado con la vida del access_token de Supabase (configurable en
// el dashboard de Supabase). Sin refresh token, cookie y token caducan
// juntos — al expirar, el admin re-inicia sesion por magic link.
const MAX_AGE_SECONDS = 60 * 60

function baseOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE_NAME)?.value ?? null
}

export function applySessionCookie(
  res: NextResponse,
  accessToken: string,
): void {
  res.cookies.set(SESSION_COOKIE_NAME, accessToken, {
    ...baseOptions(),
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    ...baseOptions(),
    maxAge: 0,
  })
}
