'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker (`/sw.js`) al cargar el layout. Hace falta
 * para que la PWA sea instalable: el browser exige un SW registrado +
 * manifest + HTTPS. El SW mismo es mínimo (ver `public/sw.js`); este
 * componente solo se encarga del registro.
 *
 * No registra en dev por defecto: el HMR reescribe assets y el SW
 * cachearía versiones viejas, dando comportamiento confuso. Para probar
 * la instalabilidad en local, exporta `NEXT_PUBLIC_SW_IN_DEV=true`.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const isProd = process.env.NODE_ENV === 'production'
    const forceDev = process.env.NEXT_PUBLIC_SW_IN_DEV === 'true'
    if (!isProd && !forceDev) return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err)
    })
  }, [])

  return null
}
