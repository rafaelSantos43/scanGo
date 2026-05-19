'use server'

import { BusinessId, LocationId } from '@/domain/value-objects/ids'
import {
  runEnsureLocationQr,
  runGenerateQr,
} from '@/infrastructure/composition'

export interface QrActionInput {
  businessId: string
  locationId: string
}

export interface QrActionResult {
  token: string
  businessId: string
  locationId: string
  generatedAt: string
  expiresAt: string
}

/**
 * UI interna del negocio (la pantalla del gym que muestra el QR): no
 * consume el API pública `/v1` (D-020). TODO(auth): cuando
 * `/scan-display` se gatee tras admin login, leer el businessId de
 * `getAdminAuthContext` en vez de aceptarlo del cliente — hoy preserva
 * el stub anterior.
 */

/**
 * Devuelve el QR activo de la sede (o genera uno nuevo si no hay
 * vigente). Lo llama el polling de la pantalla cada pocos segundos —
 * el QR queda estable mientras nadie escanee, y rota automáticamente
 * tras un uso (RF-17).
 */
export async function getActiveQrAction(
  input: QrActionInput,
): Promise<QrActionResult> {
  const result = await runEnsureLocationQr({
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

/**
 * Fuerza la emisión de un QR nuevo aunque haya uno activo vigente. Es
 * para el botón manual "Generar nuevo QR" (rotación explícita por si el
 * admin sospecha que el activo se filtró).
 */
export async function generateQrAction(
  input: QrActionInput,
): Promise<QrActionResult> {
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
