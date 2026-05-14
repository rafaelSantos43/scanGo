/**
 * Seed minimo para desarrollo: crea un Business demo con un Customer
 * activo y un Package activo de 30 visitas. Imprime los UUIDs para que
 * puedas pegarlos en los stubs de localStorage de las dos apps.
 *
 * Idempotente: si el business `demo-gym` ya existe, no inserta nada
 * y solo imprime los IDs existentes.
 *
 * Uso:
 *   cd apps/web && bun run db:seed
 *
 * Requiere DATABASE_URL apuntando a una Postgres con la migracion
 * inicial ya aplicada (bun run db:migrate).
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import {
  businesses,
  customers,
  packages,
} from '../src/infrastructure/persistence/drizzle/schema'

const DEMO_SLUG = 'demo-gym'

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL no esta definido. Configura apps/web/.env.local')
    process.exit(1)
  }

  const client = postgres(url, { max: 1, prepare: false })
  const db = drizzle(client, { schema: { businesses, customers, packages } })

  try {
    const existing = await db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, DEMO_SLUG))
      .limit(1)

    if (existing.length > 0) {
      const biz = existing[0]!
      const cust = await db
        .select()
        .from(customers)
        .where(eq(customers.businessId, biz.id))
        .limit(1)
      const pkg = await db
        .select()
        .from(packages)
        .where(eq(packages.businessId, biz.id))
        .limit(1)

      console.log('\nEl seed demo ya existia. Estos son los UUIDs:\n')
      console.log(`  Business ID:  ${biz.id}`)
      if (cust[0]) console.log(`  Customer ID:  ${cust[0].id}`)
      if (pkg[0]) console.log(`  Package ID:   ${pkg[0].id}`)
      console.log('')
      return
    }

    const businessId = crypto.randomUUID()
    const customerId = crypto.randomUUID()
    const packageId = crypto.randomUUID()
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx.insert(businesses).values({
        id: businessId,
        slug: DEMO_SLUG,
        name: 'Demo Gym',
        type: 'gym',
        timezone: 'America/Bogota',
      })
      await tx.insert(customers).values({
        id: customerId,
        businessId,
        userId: null,
        fullName: 'Juan Demo',
        email: 'juan@demo.com',
        phone: null,
        status: 'active',
      })
      await tx.insert(packages).values({
        id: packageId,
        customerId,
        businessId,
        totalVisits: 30,
        remainingVisits: 30,
        status: 'active',
        purchasedAt: now,
        expiresAt: null,
      })
    })

    console.log('\nSeed creado correctamente. Usa estos UUIDs en los stubs:\n')
    console.log(`  Business ID:  ${businessId}`)
    console.log(`  Customer ID:  ${customerId}`)
    console.log(`  Package ID:   ${packageId}`)
    console.log('')
    console.log('En la PWA (http://localhost:3001):')
    console.log(`  Customer ID = ${customerId}`)
    console.log(`  Business ID = ${businessId}`)
    console.log('')
    console.log('En el dashboard (http://localhost:3000/scan-display):')
    console.log(`  Business ID = ${businessId}`)
    console.log('')
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('Seed fallo:', err)
  process.exit(1)
})
