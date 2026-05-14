import type {
  ErrorEnvelope,
  ScanRequest,
  ScanResponse,
} from '@scango/shared-types'

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

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
  const res = await fetch(`${API_BASE}/api/v1/scan`, {
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
