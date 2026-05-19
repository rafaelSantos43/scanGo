import { NextResponse, type NextRequest } from 'next/server'

// Punto único de intercepción de requests (lo que Next 16 antes llamaba
// "middleware"). Dos responsabilidades, separadas por matcher:
//
//   - /api/:path*        → CORS para que la PWA y clientes externos
//                          puedan llamar al API.
//   - /dashboard/:path*  → refresh proactivo del access_token del admin
//                          cuando el JWT está por expirar (D-025).

// ────────────────────────────────────────────────────────────────────
// CORS para /api/*

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Customer-Id',
  'X-Business-Id',
].join(', ')

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'

function corsHeaders(origin: string | null): Record<string, string> {
  const isDev = process.env.NODE_ENV !== 'production'
  return {
    'Access-Control-Allow-Origin': isDev ? (origin ?? '*') : '',
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function handleApiCors(req: NextRequest): NextResponse {
  const headers = corsHeaders(req.headers.get('origin'))
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }
  const res = NextResponse.next()
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v)
  }
  return res
}

// ────────────────────────────────────────────────────────────────────
// Refresh del access_token del admin (D-025)

const SESSION_COOKIE = 'sg_admin_session'
const REFRESH_COOKIE = 'sg_admin_refresh'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

// Skew para evitar carrera con la página: si el token vence en <30s,
// refrescamos ya, antes de que el handler lo valide.
const EXPIRY_SKEW_MS = 30_000

/**
 * Decodifica el payload de un JWT (Base64URL) sin verificar la firma —
 * solo necesitamos el `exp` para saber si ya expiró. La verificación
 * real la hace Supabase en `verifySession`.
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

async function handleDashboardRefresh(
  req: NextRequest,
): Promise<NextResponse> {
  const access = req.cookies.get(SESSION_COOKIE)?.value
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value

  // Sin cookies o con access aún vigente: deja pasar.
  if (!access || !refresh) return NextResponse.next()
  if (!jwtIsExpired(access)) return NextResponse.next()

  // Access expirado: intenta refrescar contra el REST de Supabase
  // (fetch directo, sin SDK, para no arrastrar @supabase/supabase-js
  // al runtime del proxy).
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return NextResponse.next()

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
    // Refresh inválido/expirado: limpia cookies y deja pasar (la page
    // redirigirá a /login).
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

// ────────────────────────────────────────────────────────────────────
// Dispatcher

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname
  if (path.startsWith('/api/')) {
    return handleApiCors(req)
  }
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return handleDashboardRefresh(req)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/dashboard', '/dashboard/:path*'],
}
