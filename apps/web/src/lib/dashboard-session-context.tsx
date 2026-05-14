'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  clearDashboardSession,
  readDashboardSession,
  writeDashboardSession,
  type DashboardSession,
} from './dashboard-session'

interface DashboardSessionContextValue {
  session: DashboardSession | null
  isHydrated: boolean
  setSession: (s: DashboardSession) => void
  clear: () => void
}

const DashboardSessionContext =
  createContext<DashboardSessionContextValue | null>(null)

export function DashboardSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, setSessionState] = useState<DashboardSession | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setSessionState(readDashboardSession())
    setIsHydrated(true)
  }, [])

  function setSession(next: DashboardSession) {
    writeDashboardSession(next)
    setSessionState(next)
  }

  function clear() {
    clearDashboardSession()
    setSessionState(null)
  }

  return (
    <DashboardSessionContext.Provider
      value={{ session, isHydrated, setSession, clear }}
    >
      {children}
    </DashboardSessionContext.Provider>
  )
}

export function useDashboardSession(): DashboardSessionContextValue {
  const ctx = useContext(DashboardSessionContext)
  if (!ctx) {
    throw new Error(
      'useDashboardSession must be used within DashboardSessionProvider',
    )
  }
  return ctx
}
