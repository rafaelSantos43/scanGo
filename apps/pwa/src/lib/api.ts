import type {
  ErrorEnvelope,
  ScanRequest,
  ScanResponse,
} from '@scango/shared-types'

/**
 * Base URL del backend.
 *
 * Prioridad:
 * 1. NEXT_PUBLIC_API_BASE_URL si esta definida (override explicito para
 *    casos como prod o split-host).
 * 2. Si corremos en el browser, deriva del hostname/protocolo actual con
 *    puerto 3000. Esto hace que abrir la PWA en `https://10.2.20.81:3001`
 *    apunte a `https://10.2.20.81:3000`, evitando peleas de CORS y de
 *    aceptacion de cert self-signed por dominio.
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
    message: string,
  ) {
    super(message)
  }
}

export async function scanQrToken(
  qrToken: string,
  customerId: string,
  businessId: string,
): Promise<ScanResponse> {
  const body: ScanRequest = { qrToken }
  const res = await fetch(`${resolveApiBase()}/api/v1/scan`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-customer-id': customerId,
      'x-business-id': businessId,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const env = (await res.json()) as ErrorEnvelope
    throw new ApiError(env.error.code, env.error.message)
  }

  const json = (await res.json()) as { data: ScanResponse }
  return json.data
}
