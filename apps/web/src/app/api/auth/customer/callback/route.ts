import { NextResponse } from 'next/server'
import { InvalidMagicLinkError } from '@/domain/errors/InvalidMagicLinkError'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import { InvalidIdError } from '@/domain/errors/InvalidIdError'
import { CustomerId } from '@/domain/value-objects/ids'
import { runVerifyCustomerMagicLink } from '@/infrastructure/composition'
import { applyCustomerSessionCookies } from '../../../_lib/sessionCookie'

/**
 * Callback del magic link del customer. Es una navegación del browser
 * (GET): responde con redirects, no JSON. El email template de Supabase
 * apunta aquí con `?token_hash={{.TokenHash}}&type=magiclink` y el
 * `customer_id=<uuid>` que añadió `RequestCustomerMagicLink` al
 * `emailRedirectTo`.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const customerIdRaw = url.searchParams.get('customer_id')

  const redirectTo = (path: string): NextResponse =>
    NextResponse.redirect(new URL(path, req.url))

  if (!tokenHash || type !== 'magiclink' || !customerIdRaw) {
    return redirectTo('/scan?error=invalid_link')
  }

  let customerId
  try {
    customerId = CustomerId(customerIdRaw)
  } catch (err) {
    if (err instanceof InvalidIdError) {
      return redirectTo('/scan?error=invalid_link')
    }
    throw err
  }

  try {
    const result = await runVerifyCustomerMagicLink({
      token: tokenHash,
      customerId,
    })
    const res = redirectTo('/scan')
    applyCustomerSessionCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      customerId: result.customerId,
    })
    return res
  } catch (err) {
    if (err instanceof InvalidMagicLinkError) {
      return redirectTo('/scan?error=expired')
    }
    if (err instanceof CustomerNotFoundError) {
      return redirectTo('/scan?error=not_a_customer')
    }
    console.error('customer auth callback error', err)
    return redirectTo('/scan?error=unknown')
  }
}
