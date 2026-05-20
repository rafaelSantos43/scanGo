import { ImageResponse } from 'next/og'

// Icono 512x512: el segundo tamaño que pide el manifest. Next genera
// múltiples iconos cuando hay archivos numerados (`icon`, `icon2`, ...).
export const size = { width: 512, height: 512 }
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
          fontSize: 360,
          fontWeight: 800,
          letterSpacing: -10,
          borderRadius: 96,
        }}
      >
        S&G
      </div>
    ),
    size,
  )
}
