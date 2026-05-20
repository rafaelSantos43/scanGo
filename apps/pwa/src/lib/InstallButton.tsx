'use client'

import { Download, Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'

// El evento `beforeinstallprompt` no está en lib.dom todavía; lo tipamos
// a mano. Chrome/Edge en Android y desktop lo emiten; iOS Safari NO.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface IOSNavigator {
  standalone?: boolean
}

/**
 * Botón visible para instalar la PWA. La UX nativa del browser (el
 * cuadrito chico en la barra de URL) la encuentra solo gente técnica;
 * este botón hace explícita la acción para el cliente final.
 *
 * Tres estados:
 *  - Chrome/Edge soporta `beforeinstallprompt` → botón "Instalar app"
 *    que dispara el prompt nativo del navegador.
 *  - iOS Safari no lo emite (Apple no lo soporta) → botón "Añadir a
 *    inicio" que abre un cartel con instrucciones (Compartir → Añadir).
 *  - Ya instalada / sin soporte → no se renderiza nada.
 */
export function InstallButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    // Si ya estamos corriendo como app instalada, no ofrecer instalar.
    const isStandaloneIOS =
      (window.navigator as Navigator & IOSNavigator).standalone === true
    const isStandaloneDisplay = window.matchMedia(
      '(display-mode: standalone)',
    ).matches
    if (isStandaloneIOS || isStandaloneDisplay) {
      setInstalled(true)
      return
    }

    // iOS Safari: detecta por UA. iOS Chrome también usa el motor WebKit
    // de Apple y tampoco soporta beforeinstallprompt.
    const ua = window.navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua)) {
      setIsIOS(true)
    }

    const onBeforePrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforePrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforePrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstallClick(): Promise<void> {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    // Solo limpiamos si el user aceptó: si lo rechazó, dejamos el botón
    // por si cambia de opinión más adelante (el evento ya no se vuelve
    // a emitir en la misma sesión).
    if (outcome === 'accepted') setPrompt(null)
  }

  if (installed) return null

  if (prompt) {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm text-foreground hover:bg-muted"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Instalar app
      </button>
    )
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSHint(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm text-foreground hover:bg-muted"
        >
          <Share className="h-4 w-4" aria-hidden="true" />
          Añadir a inicio
        </button>
        {showIOSHint && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 px-4 pb-8"
            onClick={() => setShowIOSHint(false)}
          >
            <div
              className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-surface p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-base font-semibold">
                  Añadir Scan&amp;Go a tu inicio
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIOSHint(false)}
                  aria-label="Cerrar"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="flex flex-col gap-3 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary">1.</span>
                  <span>
                    Toca el botón <strong>Compartir</strong> (el cuadrado con
                    flecha hacia arriba en la barra de abajo de Safari).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary">2.</span>
                  <span>
                    Desliza y elige{' '}
                    <strong>“Añadir a pantalla de inicio”</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary">3.</span>
                  <span>
                    Confirma con <strong>“Añadir”</strong> arriba a la derecha.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}
