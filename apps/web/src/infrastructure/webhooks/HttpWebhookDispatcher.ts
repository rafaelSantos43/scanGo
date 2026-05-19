import { createHmac } from 'node:crypto'
import type { WebhookDelivery } from '@/domain/entities/WebhookDelivery'
import type { WebhookSubscription } from '@/domain/entities/WebhookSubscription'
import type {
  WebhookDispatcher,
  WebhookDispatchResult,
} from '@/domain/services/WebhookDispatcher'

// RF-21: si el receptor no responde en 10s, se considera fallo.
const TIMEOUT_MS = 10_000

/**
 * Firma cada entrega con HMAC-SHA256 y hace UN POST. No reintenta: el
 * reagendado lo decide `DeliverWebhookUseCase`. Firma según
 * ARCHITECTURE §10.3: header `X-ScanGo-Signature: t=<ts>,scheme=v1,sig=<hex>`
 * con `sig = HMAC_SHA256(signingSecret, ts + "." + body)`.
 */
export class HttpWebhookDispatcher implements WebhookDispatcher {
  async dispatch(
    delivery: WebhookDelivery,
    subscription: WebhookSubscription,
  ): Promise<WebhookDispatchResult> {
    const body = JSON.stringify(delivery.payload)
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const sig = createHmac('sha256', subscription.signingSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex')

    try {
      const res = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-scango-signature': `t=${timestamp},scheme=v1,sig=${sig}`,
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` }
      }
      return { ok: true, error: null }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'dispatch failed',
      }
    }
  }
}
