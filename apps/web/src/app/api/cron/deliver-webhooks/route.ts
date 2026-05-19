import { runDeliverWebhook } from '@/infrastructure/composition'

/**
 * Cron de entrega de webhooks. Lo invoca Vercel Cron cada minuto (ver
 * vercel.json) con `Authorization: Bearer <CRON_SECRET>`. Procesa el
 * outbox: entrega las webhook_deliveries pendientes vencidas.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await runDeliverWebhook()
    return Response.json({ data: result })
  } catch (err) {
    console.error('cron deliver-webhooks error', err)
    return Response.json({ error: { code: 'internal_error' } }, { status: 500 })
  }
}
