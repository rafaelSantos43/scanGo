import type { MetadataRoute } from 'next'

/**
 * Web App Manifest de la PWA del cliente final. Lo sirve Next como
 * `/manifest.webmanifest` y lo referencia automáticamente en `<head>`.
 *
 * `start_url: '/'` para que al abrir desde el ícono el usuario entre por
 * la landing — esta decide si pinta el scanner (si hay sesión) o la
 * pantalla de "abre tu magic link" (si no).
 *
 * Los iconos los genera Next vía `icon.tsx` / `apple-icon.tsx` (rutas
 * dinámicas), no archivos estáticos.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scan&Go',
    short_name: 'Scan&Go',
    description: 'Marca tu asistencia con un escaneo.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // OKLCH del --color-primary del theme aproximado a hex (PWA manifest
    // no acepta oklch en todos los browsers todavía).
    background_color: '#0a0a0a',
    theme_color: '#1e40af',
    icons: [
      // Cada tamaño se publica dos veces — `any` para el shelf del
      // browser, `maskable` para los launchers de Android.
      { src: '/icon', sizes: '192x192', type: 'image/png', purpose: 'any' },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/icon2', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icon2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
