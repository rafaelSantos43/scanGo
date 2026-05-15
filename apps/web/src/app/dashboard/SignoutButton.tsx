'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleSignout() {
    setBusy(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignout}
      disabled={busy}
      className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-base text-foreground hover:bg-muted disabled:opacity-50"
    >
      {busy ? 'Cerrando...' : 'Cerrar sesión'}
    </button>
  )
}
