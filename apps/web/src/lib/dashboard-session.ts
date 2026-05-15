export interface DashboardSession {
  businessId: string
  locationId: string
}

const KEY_BUSINESS = 'scango.dashboardBusinessId'
const KEY_LOCATION = 'scango.dashboardLocationId'

export function readDashboardSession(): DashboardSession | null {
  if (typeof window === 'undefined') return null
  const businessId = window.localStorage.getItem(KEY_BUSINESS)
  const locationId = window.localStorage.getItem(KEY_LOCATION)
  // Falta cualquiera de las dos → sesion invalida (incluye sesiones viejas
  // anteriores a multi-sede, que solo tenian businessId).
  if (!businessId || !locationId) return null
  return { businessId, locationId }
}

export function writeDashboardSession(s: DashboardSession): void {
  window.localStorage.setItem(KEY_BUSINESS, s.businessId)
  window.localStorage.setItem(KEY_LOCATION, s.locationId)
}

export function clearDashboardSession(): void {
  window.localStorage.removeItem(KEY_BUSINESS)
  window.localStorage.removeItem(KEY_LOCATION)
}
