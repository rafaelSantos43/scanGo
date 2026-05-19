/**
 * Fixture de prueba: crea una suscripción de webhook para el gym demo
 * apuntando a la URL que le pases. Mientras no exista el use case
 * CreateWebhookSubscription (necesita auth de API key), este script es
 * la forma de tener una suscripción para probar el flujo end-to-end.
 *
 * Uso (desde apps/web):
 *   bun run db:seed-webhook https://webhook.site/tu-uuid
 *
 * Consigue una URL de prueba gratis en https://webhook.site — te dan una
 * URL única que muestra en vivo cada request que recibe.
 *
 * Idempotente: si el gym demo ya tiene una suscripción, actualiza su url
 * y secret; si no, crea una. No la borra — un DELETE chocaría con la FK
 * de las webhook_deliveries ya encoladas.
 * Requiere DATABASE_URL en .env.local.
 */

import { randomBytes, randomUUID } from 'node:crypto'
import postgres from 'postgres'

const DEMO_SLUG = 'demo-gym'
const url = process.argv[2]

if (!url || !url.startsWith('http')) {
  console.error('Uso: bun run db:seed-webhook <url-del-receptor>')
  console.error('Consigue una URL de prueba en https://webhook.site')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('Falta DATABASE_URL en apps/web/.env.local')
  process.exit(1)
}

const sql = postgres(dbUrl, { max: 1, prepare: false })
try {
  const biz = await sql<Array<{ id: string }>>`
    SELECT id FROM businesses WHERE slug = ${DEMO_SLUG} LIMIT 1`
  if (!biz[0]) {
    console.error(
      `No existe el negocio '${DEMO_SLUG}'. Corre 'bun run db:seed' primero.`,
    )
    process.exit(1)
  }
  const businessId = biz[0].id

  const existing = await sql<Array<{ id: string }>>`
    SELECT id FROM webhook_subscriptions WHERE business_id = ${businessId} LIMIT 1`

  const signingSecret = `whsec_${randomBytes(24).toString('hex')}`
  const events = ['attendance.created', 'package.depleted']
  let id: string

  if (existing[0]) {
    id = existing[0].id
    await sql`
      UPDATE webhook_subscriptions
      SET url = ${url}, signing_secret = ${signingSecret},
          events = ${events}, status = 'active'
      WHERE id = ${id}`
  } else {
    id = randomUUID()
    await sql`
      INSERT INTO webhook_subscriptions
        (id, business_id, url, signing_secret, events, status)
      VALUES
        (${id}, ${businessId}, ${url}, ${signingSecret}, ${events}, 'active')`
  }

  console.log('\nSuscripción de webhook creada:')
  console.log(`  id:             ${id}`)
  console.log(`  negocio:        ${DEMO_SLUG} (${businessId})`)
  console.log(`  url:            ${url}`)
  console.log(`  signing_secret: ${signingSecret}`)
  console.log('  eventos:        attendance.created, package.depleted')
} finally {
  await sql.end({ timeout: 5 })
}
