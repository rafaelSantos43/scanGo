import type {
  ErrorEnvelope,
  GenerateQrResponse,
} from '@scango/shared-types'

export async function fetchNewQr(
  businessId: string,
): Promise<GenerateQrResponse> {
  const res = await fetch('/api/v1/qr/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-business-id': businessId,
    },
    body: '{}',
  })
  if (!res.ok) {
    const env = (await res.json()) as ErrorEnvelope
    throw new Error(env.error.message)
  }
  const json = (await res.json()) as { data: GenerateQrResponse }
  return json.data
}
