import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

/**
 * Sesión del admin: dos cookies HttpOnly.
 *
 * - `sg_admin_session` guarda el `access_token` (JWT corto, ~1h de vida
 *   por Supabase). Es el token que se valida en cada request.
 * - `sg_admin_refresh` guarda el `refresh_token` (largo, rotativo,
 *   ~30 días). Se usa para canjear un nuevo access_token cuando el
 *   anterior expira. El refresh lo dispara el `middleware.ts` antes de
 *   que el request llegue a las pages — un Server Component no puede
 *   escribir cookies, por eso el refresh vive en el middleware.
 *
 * Ambas cookies HttpOnly: el JS del navegador nunca las ve. Tienen el
 * mismo `maxAge` largo (la vida real de la sesión la determina la del
 * refresh_token; las cookies son solo el envoltorio).
 *
 * Decisión D-019/D-025: separamos en dos cookies (en vez de una con
 * JSON) para que cada token tenga su propia identidad y futura
 * ampliación (diferentes `SameSite`, partitioning, etc.) sea trivial.
 */
export const SESSION_COOKIE_NAME = 'sg_admin_session'
export const REFRESH_COOKIE_NAME = 'sg_admin_refresh'

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 días

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

export async function readRefreshCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(REFRESH_COOKIE_NAME)?.value ?? null
}

export interface SessionTokens {
  accessToken: string
  refreshToken: string
}

export function applySessionCookies(
  res: NextResponse,
  tokens: SessionTokens,
): void {
  const opts = { ...baseOptions(), maxAge: MAX_AGE_SECONDS }
  res.cookies.set(SESSION_COOKIE_NAME, tokens.accessToken, opts)
  res.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, opts)
}

export function clearSessionCookies(res: NextResponse): void {
  const opts = { ...baseOptions(), maxAge: 0 }
  res.cookies.set(SESSION_COOKIE_NAME, '', opts)
  res.cookies.set(REFRESH_COOKIE_NAME, '', opts)
}
