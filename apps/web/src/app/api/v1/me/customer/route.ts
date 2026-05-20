import { buildCustomerRepository } from '@/infrastructure/composition'
import { getCustomerAuthContext } from '../../../_lib/authContext'
import { mapErrorToHttp } from '../../../_lib/errorMapper'

/**
 * Identifica al customer autenticado (por la cookie HttpOnly). Lo
 * consume la PWA al cargar para saber a quién mostrar: si la respuesta
 * es 200 con datos, está logueado; si 401, redirige al "te falta
 * abrir tu magic link". No expone más que lo mínimo para renderizar
 * (id, business, nombre, email); el paquete/visitas se piden aparte
 * cuando exista esa pantalla.
 */
export async function GET(): Promise<Response> {
  try {
    const auth = await getCustomerAuthContext()
    const customer = await buildCustomerRepository().findById(
      auth.customerId,
      auth.businessId,
    )
    if (!customer) {
      // El auth context lo validó; si desapareció entre llamadas, es un
      // bug — devolvemos 401 para que el cliente reintente login.
      return Response.json(
        { error: { code: 'unauthenticated', message: 'customer not found' } },
        { status: 401 },
      )
    }
    return Response.json({
      data: {
        customerId: customer.id,
        businessId: customer.businessId,
        fullName: customer.fullName,
        email: customer.email.value,
      },
    })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
