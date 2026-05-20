import type {
  ErrorEnvelope,
  ScanRequest,
  ScanResponse,
} from '@scango/shared-types'

/**
 * Base URL del backend (apps/web).
 *
 * Prioridad:
 * 1. NEXT_PUBLIC_API_BASE_URL si está definida (override explícito para
 *    casos como prod o split-host).
 * 2. Si corremos en el browser, deriva del hostname/protocolo actual con
 *    puerto 3000. Esto hace que abrir la PWA en `https://10.2.20.81:3001`
 *    apunte a `https://10.2.20.81:3000`, evitando peleas de CORS y de
 *    aceptación de cert self-signed por dominio.
 * 3. Fallback SSR: localhost.
 */
function resolveApiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL
  if (explicit && explicit.length > 0) return explicit
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`
  }
  return 'http://localhost:3000'
}

export class ApiError extends Error {
  override readonly name = 'ApiError'
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const env = (await res.json()) as ErrorEnvelope
    return new ApiError(env.error.code, res.status, env.error.message)
  } catch {
    return new ApiError('http_error', res.status, `HTTP ${res.status}`)
  }
}

export interface MyCustomer {
  customerId: string
  businessId: string
  fullName: string
  email: string
}

/**
 * Devuelve el customer autenticado por la cookie HttpOnly, o lanza
 * `ApiError` con status 401 si no hay sesión. Lo usa la PWA al cargar
 * para decidir si pinta el scanner o el mensaje "abre tu magic link".
 */
export async function getMyCustomer(): Promise<MyCustomer> {
  const res = await fetch(`${resolveApiBase()}/api/v1/me/customer`, {
    credentials: 'include',
  })
  if (!res.ok) throw await parseError(res)
  const json = (await res.json()) as { data: MyCustomer }
  return json.data
}

/**
 * Registra una asistencia escaneando un QR. La identidad del customer
 * viene en la cookie — el llamador NO la pasa.
 */
export async function scanQrToken(qrToken: string): Promise<ScanResponse> {
  const body: ScanRequest = { qrToken }
  const res = await fetch(`${resolveApiBase()}/api/v1/scan`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await parseError(res)
  const json = (await res.json()) as { data: ScanResponse }
  return json.data
}
