'use server'

import { BusinessId, LocationId } from '@/domain/value-objects/ids'
import { runGenerateQr } from '@/infrastructure/composition'

export interface GenerateQrActionInput {
  businessId: string
  locationId: string
}

export interface GenerateQrActionResult {
  token: string
  businessId: string
  locationId: string
  generatedAt: string
  expiresAt: string
}

/**
 * UI interna del negocio (la pantalla del gym que muestra el QR): no
 * consume el API pública `/v1` (D-020). Llama `runGenerateQr` desde el
 * servidor vía Server Action. TODO(auth): cuando `/scan-display` se
 * gatee tras admin login, leer el businessId de `getAdminAuthContext`
 * en vez de aceptarlo del cliente — hoy preserva el stub anterior.
 */
export async function generateQrAction(
  input: GenerateQrActionInput,
): Promise<GenerateQrActionResult> {
  const result = await runGenerateQr({
    businessId: BusinessId(input.businessId),
    locationId: LocationId(input.locationId),
  })
  return {
    token: result.qrToken.token,
    businessId: result.qrToken.businessId,
    locationId: result.qrToken.locationId,
    generatedAt: result.qrToken.generatedAt.toISOString(),
    expiresAt: result.qrToken.expiresAt.toISOString(),
  }
}
