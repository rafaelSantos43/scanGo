import { randomBytes } from 'node:crypto'
import { WebhookSubscription } from '@/domain/entities/WebhookSubscription'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import { InvalidWebhookUrlError } from '@/domain/errors/InvalidWebhookUrlError'
import { NoWebhookEventsError } from '@/domain/errors/NoWebhookEventsError'
import {
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
} from '@/domain/events/WebhookEvent'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { WebhookSubscriptionRepository } from '@/domain/repositories/WebhookSubscriptionRepository'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import {
  WebhookSubscriptionId,
  type BusinessId,
} from '@/domain/value-objects/ids'

export interface CreateWebhookSubscriptionInput {
  businessId: BusinessId
  url: string
  events: string[]
}

export interface CreateWebhookSubscriptionResult {
  subscription: WebhookSubscription
  /** Secreto en claro para firmar HMAC. Se muestra UNA vez. */
  signingSecret: string
}

function isHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

function isWebhookEventType(s: string): s is WebhookEventType {
  return (WEBHOOK_EVENT_TYPES as readonly string[]).includes(s)
}

/**
 * Registra una suscripción de webhook para un negocio. La invoca el
 * integrador externo (Sofía) por la API pública con su API key. Genera
 * el `signingSecret` aleatorio (HMAC) y lo devuelve UNA sola vez en la
 * respuesta — después solo vive hasheado en la DB... espera, en
 * realidad vive en claro (necesitamos el plaintext en el dispatcher
 * para firmar). El secreto es por suscripción, NO una env var
 * (ARCHITECTURE §4.3, §12.4).
 */
export class CreateWebhookSubscriptionUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly subscriptions: WebhookSubscriptionRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    input: CreateWebhookSubscriptionInput,
  ): Promise<CreateWebhookSubscriptionResult> {
    if (!isHttpsUrl(input.url)) {
      throw new InvalidWebhookUrlError()
    }
    if (input.events.length === 0) {
      throw new NoWebhookEventsError()
    }
    // Filtra eventos válidos. Si algún string del input no matchea,
    // tratamos toda la request como inválida (no silenciamos).
    const events: WebhookEventType[] = []
    for (const e of input.events) {
      if (!isWebhookEventType(e)) {
        throw new InvalidWebhookUrlError(
          `Evento desconocido: "${e}". Soportados: ${WEBHOOK_EVENT_TYPES.join(', ')}`,
        )
      }
      events.push(e)
    }

    const business = await this.businesses.findById(
      input.businessId,
      input.businessId,
    )
    if (!business) throw new BusinessNotFoundError(input.businessId)

    const signingSecret = `whsec_${randomBytes(24).toString('hex')}`
    const subscription = new WebhookSubscription({
      id: WebhookSubscriptionId(this.ids.uuid()),
      businessId: input.businessId,
      url: input.url,
      signingSecret,
      events,
      status: 'active',
      createdAt: this.clock.now(),
    })
    await this.subscriptions.save(subscription, input.businessId)

    return { subscription, signingSecret }
  }
}
