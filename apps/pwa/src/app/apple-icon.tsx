import { ImageResponse } from 'next/og'

// iOS espera 180x180 sin esquinas redondeadas (las añade el sistema).
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          fontSize: 130,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        S&G
      </div>
    ),
    size,
  )
}
