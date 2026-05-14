'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSession } from '@/lib/session-context'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function Home() {
  const { session, isHydrated, setSession, clear } = useSession()
  const [customerIdInput, setCustomerIdInput] = useState('')
  const [businessIdInput, setBusinessIdInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const c = customerIdInput.trim()
    const b = businessIdInput.trim()
    if (!UUID_RE.test(c) || !UUID_RE.test(b)) {
      setError('Ambos identificadores deben ser UUIDs validos.')
      return
    }
    setSession({ customerId: c, businessId: b })
    setError(null)
    setCustomerIdInput('')
    setBusinessIdInput('')
  }

  if (!isHydrated) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16 bg-background text-foreground">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-label="Cargando"
        />
      </main>
    )
  }

  return (
    <main className="flex flex-1 w-full items-center justify-center px-6 py-12 bg-background text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Scan&amp;Go</h1>
          <p className="text-sm text-muted-foreground">
            Escanea el QR del local para registrar tu visita.
          </p>
        </header>

        {session ? (
          <div className="flex flex-col gap-4">
            <Link
              href="/scan"
              className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-6 text-lg font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ir a escanear
            </Link>
            <button
              type="button"
              onClick={clear}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Cerrar sesion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* TODO(auth): este mini-form se borra cuando exista el magic
                link. Hoy desbloquea el dev sin auth real. */}
            <p className="text-sm text-muted-foreground">
              Sin auth todavia: pega aqui tu UUID de cliente y de negocio.
            </p>
            <div className="flex flex-col gap-1">
              <label htmlFor="customerId" className="text-sm font-medium">
                Customer ID
              </label>
              <input
                id="customerId"
                type="text"
                value={customerIdInput}
                onChange={(e) => setCustomerIdInput(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="businessId" className="text-sm font-medium">
                Business ID
              </label>
              <input
                id="businessId"
                type="text"
                value={businessIdInput}
                onChange={(e) => setBusinessIdInput(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Guardar y continuar
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
