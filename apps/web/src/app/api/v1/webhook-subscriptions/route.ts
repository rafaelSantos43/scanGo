import {
  CreateWebhookSubscriptionRequestSchema,
  type CreateWebhookSubscriptionResponse,
} from '@scango/shared-types'
import { runCreateWebhookSubscription } from '@/infrastructure/composition'
import { getBusinessAuthContext } from '../../_lib/businessAuthContext'
import { mapErrorToHttp } from '../../_lib/errorMapper'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await getBusinessAuthContext(req, 'write')
    const body = CreateWebhookSubscriptionRequestSchema.parse(await req.json())

    const result = await runCreateWebhookSubscription({
      businessId: auth.businessId,
      url: body.url,
      events: body.events,
    })

    const dto: CreateWebhookSubscriptionResponse = {
      subscriptionId: result.subscription.id,
      businessId: result.subscription.businessId,
      url: result.subscription.url,
      events: [...result.subscription.events],
      status: result.subscription.status,
      createdAt: result.subscription.createdAt.toISOString(),
      signingSecret: result.signingSecret,
    }
    return Response.json({ data: dto }, { status: 201 })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
