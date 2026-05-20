'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ApiError, getMyCustomer } from '@/lib/api'

// Mensajes para cuando el callback del magic link rebota con ?error=...
const CALLBACK_ERRORS: Record<string, string> = {
  invalid_link: 'El enlace no es válido.',
  expired: 'El enlace caducó o ya fue usado.',
  not_a_customer: 'Este enlace no corresponde a una cuenta de cliente.',
  unknown: 'Algo salió mal. Pídele al local que te envíe un enlace nuevo.',
}

function LandingInner() {
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')

  const me = useQuery({
    queryKey: ['me-customer'],
    queryFn: getMyCustomer,
    retry: false,
  })

  if (me.isPending) {
    return (
      <Loader2
        className="h-6 w-6 animate-spin text-muted-foreground"
        aria-label="Cargando"
      />
    )
  }

  if (me.isError) {
    // 401 → sin sesión: mostrar pantalla de "abre tu link". Cualquier
    // otro error de red también caemos aquí; el usuario reintenta.
    const isUnauth =
      me.error instanceof ApiError && me.error.status === 401
    return (
      <div className="flex w-full max-w-sm flex-col gap-5 text-center">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Scan&amp;Go</h1>
          <p className="text-sm text-muted-foreground">
            {isUnauth
              ? 'Abre el enlace de invitación que te envió el local. Si no te llegó, pídele que te lo reenvíe.'
              : 'No pudimos conectar. Revisa tu internet y recarga.'}
          </p>
        </header>

        {callbackError && (
          <p
            role="alert"
            className="rounded-md border border-danger bg-surface px-3 py-2 text-sm text-danger"
          >
            {CALLBACK_ERRORS[callbackError] ?? CALLBACK_ERRORS.unknown}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 text-center">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Scan&amp;Go</h1>
        <p className="text-base text-muted-foreground">
          Hola, <span className="text-foreground">{me.data.fullName}</span>.
        </p>
      </header>
      <Link
        href="/scan"
        className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-6 text-lg font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Escanear QR del local
      </Link>
    </div>
  )
}

export default function Home() {
  return (
    <main className="flex flex-1 w-full items-center justify-center px-6 py-12 bg-background text-foreground">
      <Suspense
        fallback={
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            aria-label="Cargando"
          />
        }
      >
        <LandingInner />
      </Suspense>
    </main>
  )
}
