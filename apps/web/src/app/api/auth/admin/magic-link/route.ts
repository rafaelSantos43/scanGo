import {
  RequestAdminMagicLinkRequestSchema,
  type RequestAdminMagicLinkResponse,
} from '@scango/shared-types'
import { runRequestAdminMagicLink } from '@/infrastructure/composition'
import { mapErrorToHttp } from '../../../_lib/errorMapper'

// Endpoint publico de inicio de sesion: cualquiera puede pedir un magic
// link. El filtro "es admin" ocurre en el callback, no aqui — por eso la
// respuesta es neutral y no revela si el email existe.
export async function POST(req: Request): Promise<Response> {
  try {
    const body = RequestAdminMagicLinkRequestSchema.parse(await req.json())
    const result = await runRequestAdminMagicLink({ email: body.email })
    const dto: RequestAdminMagicLinkResponse = { sent: result.sent }
    return Response.json({ data: dto }, { status: 200 })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
