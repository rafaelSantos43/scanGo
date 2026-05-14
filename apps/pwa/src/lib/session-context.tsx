'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  clearSession as clearStored,
  readSession,
  writeSession,
  type ScanGoClientSession,
} from './session'

interface SessionContextValue {
  session: ScanGoClientSession | null
  isHydrated: boolean
  setSession: (s: ScanGoClientSession) => void
  clear: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<ScanGoClientSession | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setSessionState(readSession())
    setIsHydrated(true)
  }, [])

  function setSession(next: ScanGoClientSession) {
    writeSession(next)
    setSessionState(next)
  }

  function clear() {
    clearStored()
    setSessionState(null)
  }

  return (
    <SessionContext.Provider value={{ session, isHydrated, setSession, clear }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}
