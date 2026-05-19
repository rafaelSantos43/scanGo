import type { NextConfig } from 'next'
import { networkInterfaces } from 'node:os'

// Detecta las IPs IPv4 de la maquina para que puedas abrir el dashboard
// (ej. /scan-display) desde una tablet en la misma red sin que Next.js
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
  // Modulo nativo (N-API): que Next lo trate como external y no intente
  // empaquetar el binario .node en el bundle del servidor.
  serverExternalPackages: ['@node-rs/argon2'],
}

export default nextConfig
