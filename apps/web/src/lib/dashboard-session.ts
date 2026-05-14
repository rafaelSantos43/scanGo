export interface DashboardSession {
  businessId: string
}

const KEY_BUSINESS = 'scango.dashboardBusinessId'

export function readDashboardSession(): DashboardSession | null {
  if (typeof window === 'undefined') return null
  const businessId = window.localStorage.getItem(KEY_BUSINESS)
  if (!businessId) return null
  return { businessId }
}

export function writeDashboardSession(s: DashboardSession): void {
  window.localStorage.setItem(KEY_BUSINESS, s.businessId)
}

export function clearDashboardSession(): void {
  window.localStorage.removeItem(KEY_BUSINESS)
}
