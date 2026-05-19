'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useDashboardSession } from '@/lib/dashboard-session-context'
import { generateQrAction, getActiveQrAction } from './actions'

// Cada cuánto re-pregunta la pantalla por el QR activo. TanStack Query
// pausa automáticamente este intervalo cuando la pestaña no está
// visible (`refetchIntervalInBackground` default false), así que no
// gasta cuando nadie mira la pantalla.
const POLL_INTERVAL_MS = 5000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function ScanDisplayPage() {
  const { session, isHydrated, setSession } = useDashboardSession()
  const queryClient = useQueryClient()
  const queryKey = ['active-qr', session?.businessId, session?.locationId]

  // RF-17: polling barato del QR activo. Mientras nadie escanee el
  // server devuelve siempre el mismo token; tras un escaneo el latest
  // active desaparece y `runEnsureLocationQr` genera uno nuevo, que la
  // pantalla muestra en el siguiente tick.
  const qr = useQuery({
    queryKey,
    queryFn: () =>
      getActiveQrAction({
        businessId: session!.businessId,
        locationId: session!.locationId,
      }),
    enabled: Boolean(session?.businessId && session?.locationId),
    refetchInterval: POLL_INTERVAL_MS,
  })

  // Botón manual: fuerza la emisión de un QR nuevo aunque haya uno
  // activo vigente (rotación explícita por sospecha de filtración).
  const forceNew = useMutation({
    mutationFn: () =>
      generateQrAction({
        businessId: session!.businessId,
        locationId: session!.locationId,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
    },
  })

  function handleSetupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const businessId = String(form.get('businessId') ?? '').trim()
    const locationId = String(form.get('locationId') ?? '').trim()
    if (!UUID_RE.test(businessId) || !UUID_RE.test(locationId)) return
    setSession({ businessId, locationId })
  }

  if (!isHydrated) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background text-foreground">
        <Loader2
          className="h-8 w-8 animate-spin text-muted-foreground"
          aria-label="Cargando"
        />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12 bg-background text-foreground">
        <form
          onSubmit={handleSetupSubmit}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          <h1 className="text-2xl font-semibold">Conectar pantalla</h1>
          <p className="text-sm text-muted-foreground">
            Pega el UUID de tu negocio y de la sede para que la pantalla
            muestre el QR de esa sede.
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
          <label htmlFor="locationId" className="text-sm font-medium">
            Location ID (sede)
          </label>
          <input
            id="locationId"
            name="locationId"
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
        className="flex aspect-square w-full max-w-md items-center justify-center rounded-2xl border border-border bg-surface p-8"
        aria-live="polite"
      >
        {qr.isPending && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
            <p className="text-base">Generando QR...</p>
          </div>
        )}

        {qr.isSuccess && (
          <QRCodeSVG
            value={qr.data.token}
            size={384}
            bgColor="transparent"
            fgColor="currentColor"
            className="h-full w-full text-foreground"
          />
        )}

        {qr.isError && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-base text-danger">
              No se pudo generar el QR.
            </p>
            <button
              type="button"
              onClick={() => qr.refetch()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => forceNew.mutate()}
        disabled={forceNew.isPending || qr.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-base text-foreground hover:bg-muted disabled:opacity-50"
      >
        <RefreshCw
          className={`h-4 w-4 ${forceNew.isPending ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        Generar nuevo QR
      </button>
    </main>
  )
}
