import { NextResponse, type NextRequest } from 'next/server'

// CORS para que la PWA (apps/pwa en otro puerto, o desde celular en
// la LAN) pueda llamar a /api/v1/*. En dev se acepta cualquier origin
// que el browser reporte. En produccion habra que listar dominios
// concretos cuando deployemos.

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

export function proxy(req: NextRequest): NextResponse {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  const res = NextResponse.next()
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v)
  }
  return res
}

export const config = {
  matcher: '/api/:path*',
}
