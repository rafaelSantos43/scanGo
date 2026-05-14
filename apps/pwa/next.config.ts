import type { NextConfig } from 'next'
import { networkInterfaces } from 'node:os'

// Detecta las IPs IPv4 de la maquina (Wi-Fi, ethernet, etc.) para que
// puedas abrir la PWA desde el celular en la misma red sin que Next.js
// la bloquee. Solo aplica en dev — produccion sirve detras de un dominio.
function lanOrigins(): string[] {
  const out: string[] = []
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address)
    }
  }
  return out
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanOrigins(),
}

export default nextConfig
