import {
  GenerateQrRequestSchema,
  type GenerateQrResponse,
} from '@scango/shared-types'
import { runGenerateQr } from '@/infrastructure/composition'
import { LocationId } from '@/domain/value-objects/ids'
import { getBusinessAuthContext } from '../../../_lib/businessAuthContext'
import { mapErrorToHttp } from '../../../_lib/errorMapper'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await getBusinessAuthContext(req, 'write')

    // El body trae locationId (la sede de esta pantalla). Body vacio o
    // no-JSON cae como {} y falla la validacion (.strict() + locationId
    // requerido) con 400, que es el comportamiento correcto.
    let raw: unknown = {}
    const text = await req.text()
    if (text.trim().length > 0) {
      raw = JSON.parse(text)
    }
    const parsed = GenerateQrRequestSchema.parse(raw)

    const result = await runGenerateQr({
      businessId: auth.businessId,
      locationId: LocationId(parsed.locationId),
    })

    const dto: GenerateQrResponse = {
      token: result.qrToken.token,
      businessId: result.qrToken.businessId,
      locationId: result.qrToken.locationId,
      generatedAt: result.qrToken.generatedAt.toISOString(),
      expiresAt: result.qrToken.expiresAt.toISOString(),
    }

    return Response.json({ data: dto }, { status: 201 })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
