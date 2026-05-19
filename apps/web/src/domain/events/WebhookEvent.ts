/**
 * Tipos de evento de webhook soportados en v1 (ARCHITECTURE §10.1).
 * - `attendance.created`: tras un escaneo exitoso.
 * - `package.depleted`: cuando un escaneo deja el paquete en 0 visitas.
 */
export type WebhookEventType = 'attendance.created' | 'package.depleted'

export const WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = [
  'attendance.created',
  'package.depleted',
]
