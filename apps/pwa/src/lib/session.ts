// TODO(auth): cuando exista el magic link real, esta capa se reemplaza por
// lectura de la cookie HttpOnly de Supabase Auth. Hoy guarda en localStorage
// los UUIDs que el endpoint stub espera en los headers X-Customer-Id y
// X-Business-Id.

export interface ScanGoClientSession {
  customerId: string
  businessId: string
}

const KEY_CUSTOMER = 'scango.customerId'
const KEY_BUSINESS = 'scango.businessId'

export function readSession(): ScanGoClientSession | null {
  if (typeof window === 'undefined') return null
  const customerId = window.localStorage.getItem(KEY_CUSTOMER)
  const businessId = window.localStorage.getItem(KEY_BUSINESS)
  if (!customerId || !businessId) return null
  return { customerId, businessId }
}

export function writeSession(s: ScanGoClientSession): void {
  window.localStorage.setItem(KEY_CUSTOMER, s.customerId)
  window.localStorage.setItem(KEY_BUSINESS, s.businessId)
}

export function clearSession(): void {
  window.localStorage.removeItem(KEY_CUSTOMER)
  window.localStorage.removeItem(KEY_BUSINESS)
}
