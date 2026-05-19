import { NextResponse } from 'next/server'
import type { SignoutResponse } from '@scango/shared-types'
import { clearSessionCookies } from '../../_lib/sessionCookie'

// Cerrar sesion = borrar las cookies (access + refresh). La sesion de
// Supabase en si no se invalida server-side (fuera de alcance de v1).
export async function POST(): Promise<Response> {
  const dto: SignoutResponse = { signedOut: true }
  const res = NextResponse.json({ data: dto }, { status: 200 })
  clearSessionCookies(res)
  return res
}
