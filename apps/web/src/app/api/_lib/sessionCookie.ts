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

// Sesión del customer (PWA del cliente final). Mismo formato que la del
// admin pero cookies separadas — admin y customer pueden coexistir en el
// mismo browser sin interferir. Además, el callback del customer guarda
// el `customer_id` en una tercera cookie HttpOnly para que el
// middleware de auth resuelva el customer sin pasar por la DB en cada
// request (el JWT de Supabase no carga este claim).
export const CUSTOMER_SESSION_COOKIE_NAME = 'sg_customer_session'
export const CUSTOMER_REFRESH_COOKIE_NAME = 'sg_customer_refresh'
export const CUSTOMER_ID_COOKIE_NAME = 'sg_customer_id'

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

// ── Customer session helpers ────────────────────────────────────────

export interface CustomerSessionTokens extends SessionTokens {
  customerId: string
}

export async function readCustomerSessionCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(CUSTOMER_SESSION_COOKIE_NAME)?.value ?? null
}

export async function readCustomerRefreshCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(CUSTOMER_REFRESH_COOKIE_NAME)?.value ?? null
}

export async function readCustomerIdCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(CUSTOMER_ID_COOKIE_NAME)?.value ?? null
}

export function applyCustomerSessionCookies(
  res: NextResponse,
  tokens: CustomerSessionTokens,
): void {
  const opts = { ...baseOptions(), maxAge: MAX_AGE_SECONDS }
  res.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, tokens.accessToken, opts)
  res.cookies.set(CUSTOMER_REFRESH_COOKIE_NAME, tokens.refreshToken, opts)
  res.cookies.set(CUSTOMER_ID_COOKIE_NAME, tokens.customerId, opts)
}

export function clearCustomerSessionCookies(res: NextResponse): void {
  const opts = { ...baseOptions(), maxAge: 0 }
  res.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, '', opts)
  res.cookies.set(CUSTOMER_REFRESH_COOKIE_NAME, '', opts)
  res.cookies.set(CUSTOMER_ID_COOKIE_NAME, '', opts)
}
