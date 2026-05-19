import { NextResponse, type NextRequest } from 'next/server'

// Skew para evitar carrera con la página: si el token vence en <30s,
// refrescamos ya, antes de que el handler lo valide.
const EXPIRY_SKEW_MS = 30_000

const SESSION_COOKIE = 'sg_admin_session'
const REFRESH_COOKIE = 'sg_admin_refresh'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

/**
 * Decodifica el payload de un JWT (Base64URL) sin verificar la firma —
 * solo necesitamos el `exp` para saber si ya expiró. La verificación
 * de validez la hace Supabase en `verifySession`.
 */
function jwtIsExpired(jwt: string): boolean {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(
      Buffer.from(parts[1]!, 'base64').toString('utf-8'),
    ) as { exp?: number }
    if (typeof payload.exp !== 'number') return true
    return payload.exp * 1000 < Date.now() + EXPIRY_SKEW_MS
  } catch {
    return true
  }
}

function cookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  }
}

/**
 * Middleware del dashboard del admin. Cuando el access_token del JWT
 * está por vencer, intenta canjear el refresh_token por un par nuevo
 * y escribe las cookies refrescadas en la respuesta. Si el refresh
 * falla, borra las cookies — la page redirige a /login.
 *
 * No bloquea ni hace lookups extra cuando el access sigue vigente:
 * deja pasar. La verificación real (getUser) la hace cada page con
 * `getAdminAuthContext`.
 *
 * Llama al endpoint REST de Supabase con fetch directo (no usa el SDK)
 * para no arrastrar `@supabase/supabase-js` al runtime del middleware.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const access = req.cookies.get(SESSION_COOKIE)?.value
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value

  // Sin cookies: deja pasar; la page redirigirá a /login.
  if (!access || !refresh) return NextResponse.next()

  // Access aún vigente: nada que hacer.
  if (!jwtIsExpired(access)) return NextResponse.next()

  // Access expirado: intenta refrescar.
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    // Sin env vars no podemos refrescar: deja pasar y que la page maneje
    // la sesión vencida con un redirect a /login.
    return NextResponse.next()
  }

  const refreshRes = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refresh }),
    },
  )

  if (!refreshRes.ok) {
    // Refresh inválido/expirado: limpia las cookies y deja que la page
    // redirija a /login.
    const res = NextResponse.next()
    res.cookies.delete(SESSION_COOKIE)
    res.cookies.delete(REFRESH_COOKIE)
    return res
  }

  const data = (await refreshRes.json()) as {
    access_token?: string
    refresh_token?: string
  }
  if (!data.access_token || !data.refresh_token) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  res.cookies.set(SESSION_COOKIE, data.access_token, cookieOptions())
  res.cookies.set(REFRESH_COOKIE, data.refresh_token, cookieOptions())
  return res
}

export const config = {
  // Solo intercepta las rutas que usan la sesión del admin. La PWA del
  // cliente, las rutas /api/v1/* (API key) y el callback de auth se
  // saltan a propósito.
  matcher: ['/dashboard/:path*'],
}
