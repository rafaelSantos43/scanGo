/**
 * Fixture de un administrador de prueba, para poder probar el login por
 * magic link de Phase 2 sin tener RegisterBusiness (CU-01) todavia.
 *
 * Idempotente: crea (o reutiliza) el usuario `admin@demo.com` en Supabase
 * Auth e inserta la fila `business_admins` ligandolo al gym demo. El
 * businessId se resuelve por el slug `demo-gym`, asi que corre primero
 * `bun run db:seed`.
 *
 * Uso:
 *   cd apps/web && bun run db:seed-admin
 *
 * Requiere en .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * DATABASE_URL (todos del MISMO proyecto Supabase).
 */

import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const ADMIN_EMAIL = 'admin@demo.com'
const DEMO_SLUG = 'demo-gym'

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const dbUrl = process.env.DATABASE_URL
  if (!supabaseUrl || !serviceRoleKey || !dbUrl) {
    console.error(
      'Faltan env vars en apps/web/.env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL',
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Buscar o crear el usuario admin en Supabase Auth.
  let userId: string
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('listUsers fallo:', listErr.message)
    process.exit(1)
  }
  const existing = list.users.find((u) => u.email === ADMIN_EMAIL)
  if (existing) {
    userId = existing.id
    console.log(`Usuario admin ya existía en Supabase Auth: ${ADMIN_EMAIL}`)
  } else {
    // Sin password: el login es solo por magic link. email_confirm evita
    // el paso de confirmación de correo.
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      email_confirm: true,
    })
    if (error || !data.user) {
      console.error('createUser fallo:', error?.message ?? 'sin usuario')
      process.exit(1)
    }
    userId = data.user.id
    console.log(`Usuario admin creado en Supabase Auth: ${ADMIN_EMAIL}`)
  }

  // Resolver el businessId del gym demo e insertar la relación admin.
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

    await sql`
      INSERT INTO business_admins (business_id, user_id)
      VALUES (${businessId}, ${userId})
      ON CONFLICT DO NOTHING`

    console.log('\nAdmin de prueba listo:')
    console.log(`  Email:        ${ADMIN_EMAIL}`)
    console.log(`  User ID:      ${userId}`)
    console.log(`  Business ID:  ${businessId}`)
    console.log(
      `\nPide un magic link en http://localhost:3000/login con ${ADMIN_EMAIL}.`,
    )
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('seed-admin falló:', err)
  process.exit(1)
})
