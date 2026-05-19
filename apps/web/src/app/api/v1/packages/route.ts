import {
  AssignPackageRequestSchema,
  type AssignPackageResponse,
} from '@scango/shared-types'
import { runAssignPackage } from '@/infrastructure/composition'
import { CustomerId } from '@/domain/value-objects/ids'
import { getBusinessAuthContext } from '../../_lib/businessAuthContext'
import { mapErrorToHttp } from '../../_lib/errorMapper'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await getBusinessAuthContext(req, 'write')
    const body = AssignPackageRequestSchema.parse(await req.json())

    const result = await runAssignPackage({
      customerId: CustomerId(body.customerId),
      businessId: auth.businessId,
      totalVisits: body.totalVisits,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })

    const dto: AssignPackageResponse = {
      packageId: result.package.id,
      customerId: result.package.customerId,
      businessId: result.package.businessId,
      totalVisits: result.package.totalVisits.value,
      remainingVisits: result.package.remainingVisits.value,
      status: result.package.status,
      purchasedAt: result.package.purchasedAt.toISOString(),
      expiresAt: result.package.expiresAt?.toISOString() ?? null,
    }
    return Response.json({ data: dto }, { status: 201 })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
