import { NextResponse } from 'next/server'
import type { SignoutResponse } from '@scango/shared-types'
import { clearCustomerSessionCookies } from '../../../_lib/sessionCookie'

// Cerrar sesión del customer = borrar sus cookies (session + refresh +
// id). La sesión en Supabase no se invalida server-side (fuera de
// alcance de v1).
export async function POST(): Promise<Response> {
  const dto: SignoutResponse = { signedOut: true }
  const res = NextResponse.json({ data: dto }, { status: 200 })
  clearCustomerSessionCookies(res)
  return res
}
