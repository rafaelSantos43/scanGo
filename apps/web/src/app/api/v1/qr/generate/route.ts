import {
  GenerateQrRequestSchema,
  type GenerateQrResponse,
} from '@scango/shared-types'
import { runGenerateQr } from '@/infrastructure/composition'
import { getBusinessAuthContext } from '../../../_lib/businessAuthContext'
import { mapErrorToHttp } from '../../../_lib/errorMapper'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = getBusinessAuthContext(req)

    // Parse aunque el body sea {} para validar (.strict()) que no traen
    // campos extra. Si el body viene vacio o no-JSON, asumimos {}.
    let raw: unknown = {}
    const text = await req.text()
    if (text.trim().length > 0) {
      raw = JSON.parse(text)
    }
    GenerateQrRequestSchema.parse(raw)

    const result = await runGenerateQr({ businessId: auth.businessId })

    const dto: GenerateQrResponse = {
      token: result.qrToken.token,
      businessId: result.qrToken.businessId,
      generatedAt: result.qrToken.generatedAt.toISOString(),
      expiresAt: result.qrToken.expiresAt.toISOString(),
    }

    return Response.json({ data: dto }, { status: 201 })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
