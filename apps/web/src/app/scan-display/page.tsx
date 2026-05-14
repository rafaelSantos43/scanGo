'use client'

import { Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import type { GenerateQrResponse } from '@scango/shared-types'
import { fetchNewQr } from '@/lib/api/client'

// TODO(auth): se reemplaza por la sesion del dashboard cuando exista. Hoy el
// dueno del negocio guarda su businessId en localStorage para que el endpoint
// stub lo lea via X-Business-Id.
const KEY_BUSINESS = 'scango.dashboardBusinessId'
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Compromiso entre RF-17 (regenerar tras uso) y simplicidad de v1. Polling
// fijo cada 30s — sin Realtime hasta que exista RLS en DB.
const REFRESH_SECONDS = 30

type Phase =
  | { kind: 'setup' }
  | { kind: 'loading' }
  | { kind: 'success'; qr: GenerateQrResponse; countdown: number }
  | { kind: 'error'; message: string }

export default function ScanDisplayPage() {
  const [ready, setReady] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })

  // Bootstrap: leer businessId de localStorage al montar.
  useEffect(() => {
    const stored = window.localStorage.getItem(KEY_BUSINESS)
    if (stored && UUID_RE.test(stored)) {
      setBusinessId(stored)
    } else {
      setPhase({ kind: 'setup' })
    }
    setReady(true)
  }, [])

  // Pedir QR al montar y cada REFRESH_SECONDS.
  useEffect(() => {
    if (!businessId) return

    let active = true
    let timer: ReturnType<typeof setInterval> | null = null
    let countdownTimer: ReturnType<typeof setInterval> | null = null

    async function refresh() {
      if (!active) return
      try {
        const qr = await fetchNewQr(businessId!)
        if (!active) return
        setPhase({ kind: 'success', qr, countdown: REFRESH_SECONDS })
      } catch (err) {
        if (!active) return
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo generar el QR. Reintentando...'
        setPhase({ kind: 'error', message })
      }
    }

    setPhase({ kind: 'loading' })
    refresh()
    timer = setInterval(refresh, REFRESH_SECONDS * 1000)
    countdownTimer = setInterval(() => {
      setPhase((p) =>
        p.kind === 'success' && p.countdown > 0
          ? { ...p, countdown: p.countdown - 1 }
          : p,
      )
    }, 1000)

    return () => {
      active = false
      if (timer) clearInterval(timer)
      if (countdownTimer) clearInterval(countdownTimer)
    }
  }, [businessId])

  function handleSetupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const id = String(form.get('businessId') ?? '').trim()
    if (!UUID_RE.test(id)) return
    window.localStorage.setItem(KEY_BUSINESS, id)
    setBusinessId(id)
  }

  function handleRetry() {
    // Forzar re-ejecucion del effect simulando un cambio de businessId.
    setPhase({ kind: 'loading' })
    setBusinessId((b) => (b ? `${b}` : b))
  }

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Cargando" />
      </main>
    )
  }

  if (phase.kind === 'setup' || !businessId) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12 bg-background text-foreground">
        <form
          onSubmit={handleSetupSubmit}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          <h1 className="text-2xl font-semibold">Conectar pantalla</h1>
          <p className="text-sm text-muted-foreground">
            Pega el UUID de tu negocio para que la pantalla muestre tu QR.
          </p>
          <label htmlFor="businessId" className="text-sm font-medium">
            Business ID
          </label>
          <input
            id="businessId"
            name="businessId"
            type="text"
            required
            placeholder="00000000-0000-0000-0000-000000000000"
            className="h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoComplete="off"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground"
          >
            Guardar
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 bg-background text-foreground">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Scan&amp;Go</h1>
        <p className="text-sm text-muted-foreground">
          Escanea este QR con tu telefono
        </p>
      </header>

      <div
        className="flex aspect-square w-full max-w-[28rem] items-center justify-center rounded-2xl border border-border bg-surface p-8"
        aria-live="polite"
      >
        {phase.kind === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
            <p className="text-base">Generando QR...</p>
          </div>
        )}

        {phase.kind === 'success' && (
          <QRCodeSVG
            value={phase.qr.token}
            size={384}
            bgColor="transparent"
            fgColor="currentColor"
            className="h-full w-full text-foreground"
          />
        )}

        {phase.kind === 'error' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-base text-danger">{phase.message}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Reintentar ahora
            </button>
          </div>
        )}
      </div>

      <footer className="text-sm text-muted-foreground">
        {phase.kind === 'success' && (
          <span>Renueva en {phase.countdown}s</span>
        )}
        {phase.kind === 'loading' && <span>Cargando...</span>}
        {phase.kind === 'error' && <span>Reintentando automaticamente</span>}
      </footer>
    </main>
  )
}
