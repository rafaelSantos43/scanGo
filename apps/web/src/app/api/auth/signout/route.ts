import { NextResponse } from 'next/server'
import type { SignoutResponse } from '@scango/shared-types'
import { clearSessionCookie } from '../../_lib/sessionCookie'

// Cerrar sesion = borrar la cookie. La sesion de Supabase en si no se
// invalida server-side (fuera de alcance de Phase 2).
export async function POST(): Promise<Response> {
  const dto: SignoutResponse = { signedOut: true }
  const res = NextResponse.json({ data: dto }, { status: 200 })
  clearSessionCookie(res)
  return res
}
