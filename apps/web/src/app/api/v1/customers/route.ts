import {
  CreateCustomerRequestSchema,
  type CreateCustomerResponse,
} from '@scango/shared-types'
import { runCreateCustomer } from '@/infrastructure/composition'
import { getBusinessAuthContext } from '../../_lib/businessAuthContext'
import { mapErrorToHttp } from '../../_lib/errorMapper'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await getBusinessAuthContext(req, 'write')
    const body = CreateCustomerRequestSchema.parse(await req.json())

    const result = await runCreateCustomer({
      businessId: auth.businessId,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone ?? null,
    })

    const dto: CreateCustomerResponse = {
      customerId: result.customer.id,
      businessId: result.customer.businessId,
      fullName: result.customer.fullName,
      email: result.customer.email.value,
      phone: result.customer.phone,
      status: result.customer.status,
      createdAt: result.customer.createdAt.toISOString(),
    }
    return Response.json({ data: dto }, { status: 201 })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
