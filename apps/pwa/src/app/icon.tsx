import { ImageResponse } from 'next/og'

// Icono 192x192 (mínimo recomendado para PWA installable).
export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1e40af',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 140,
          fontWeight: 800,
          letterSpacing: -4,
          borderRadius: 36,
        }}
      >
        S&G
      </div>
    ),
    size,
  )
}
