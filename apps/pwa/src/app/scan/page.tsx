'use client'

import { useMutation } from '@tanstack/react-query'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Check, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ApiError, scanQrToken } from '@/lib/api'
import { useSession } from '@/lib/session-context'

function messageForCode(code: string): string {
  switch (code) {
    case 'already_scanned_today':
      return 'Ya marcaste tu asistencia hoy.'
    case 'package_depleted':
      return 'Tu paquete se agoto. Renueva con el local.'
    case 'no_active_package':
      return 'No tienes paquete activo. Habla con el local.'
    case 'qr_token_expired':
      return 'Este QR caduco. Pide al local que muestre uno nuevo.'
    case 'qr_token_already_used':
      return 'Este QR ya fue usado. Pide al local que muestre uno nuevo.'
    case 'qr_token_not_found':
      return 'QR invalido. Verifica que estes escaneando el correcto.'
    case 'customer_disabled':
      return 'Tu cuenta esta deshabilitada. Habla con el local.'
    case 'unauthenticated':
      return 'Sesion expirada. Vuelve a entrar al link de invitacion.'
    default:
      return 'Algo salio mal. Intenta de nuevo.'
  }
}

export default function ScanPage() {
  const { session, isHydrated } = useSession()
  const [screen, setScreen] = useState<'idle' | 'scanning'>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)

  const scan = useMutation({
    mutationFn: (qrToken: string) => {
      if (!session) throw new Error('Sesion no disponible')
      return scanQrToken(qrToken, session.customerId, session.businessId)
    },
  })

  function startScanning() {
    setCameraError(null)
    scan.reset()
    setScreen('scanning')
  }

  function backToIdle() {
    scan.reset()
    setCameraError(null)
    setScreen('idle')
  }

  if (!isHydrated) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background text-foreground">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Cargando"
        />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 bg-background text-foreground">
        <p className="text-base text-muted-foreground text-center">
          Necesitas iniciar sesion antes de escanear.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground"
        >
          Volver al inicio
        </Link>
      </main>
    )
  }

  const errorMessage = cameraError
    ? cameraError
    : scan.isError
      ? scan.error instanceof ApiError
        ? messageForCode(scan.error.code)
        : 'No se pudo conectar. Revisa tu internet.'
      : null

  return (
    <main className="flex flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold">Escanear</h1>
        <Link
          href="/"
          aria-label="Volver"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Salir
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        {errorMessage ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger">
              <X
                className="h-10 w-10 text-danger-foreground"
                aria-label="Error"
              />
            </div>
            <p className="text-lg text-foreground">{errorMessage}</p>
            <button
              type="button"
              onClick={startScanning}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground"
            >
              Reintentar
            </button>
          </div>
        ) : scan.isSuccess ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success">
              <Check
                className="h-10 w-10 text-success-foreground"
                aria-label="Asistencia registrada"
              />
            </div>
            <p className="text-base text-muted-foreground">
              {scan.data.alreadyRegistered
                ? 'Ya registraste tu visita de hoy.'
                : 'Asistencia registrada.'}
            </p>
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-bold text-foreground">
                {scan.data.remainingVisits}
              </span>
              <span className="text-base text-muted-foreground">
                visitas restantes
              </span>
            </div>
            <button
              type="button"
              onClick={backToIdle}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground"
            >
              OK
            </button>
          </div>
        ) : scan.isPending ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2
              className="h-12 w-12 animate-spin text-primary"
              aria-label="Verificando"
            />
            <p className="text-base text-muted-foreground">
              Verificando tu asistencia...
            </p>
          </div>
        ) : screen === 'scanning' ? (
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <div className="relative w-full overflow-hidden rounded-lg border border-border bg-surface aspect-square">
              <Scanner
                onScan={(detectedCodes) => {
                  const code = detectedCodes[0]?.rawValue
                  if (code && !scan.isPending) scan.mutate(code)
                }}
                onError={(err) => {
                  console.error('camera error', err)
                  setCameraError(
                    'No pudimos abrir la camara. Revisa el permiso del navegador.',
                  )
                }}
                formats={['qr_code']}
              />
            </div>
            <button
              type="button"
              onClick={backToIdle}
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-6 text-base text-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Listo para escanear
            </h2>
            <p className="text-base text-muted-foreground">
              Apunta la camara al QR del local.
            </p>
            <button
              type="button"
              onClick={startScanning}
              className="inline-flex h-14 w-full items-center justify-center rounded-md bg-primary px-6 text-lg font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Iniciar escaner
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
