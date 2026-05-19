/**
 * Atajo de desarrollo: genera un magic link de login para un customer
 * y lo imprime, sin pasar por el correo. Para probar el login del
 * cliente final en local sin depender del envío de email de Supabase.
 *
 * Uso (desde apps/web):
 *   bun run dev:customer-link <customer_id>
 *
 * `customer_id` es el UUID de una fila de `customers`. Puedes verlo en
 * el dashboard (link "Clientes") o con un SELECT en la DB.
 *
 * Requiere en .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_APP_URL.
 */

import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const customerId = process.argv[2]
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL
const dbUrl = process.env.DATABASE_URL

if (!customerId) {
  console.error('Uso: bun run dev:customer-link <customer_id>')
  process.exit(1)
}
if (!supabaseUrl || !serviceRoleKey || !appUrl || !dbUrl) {
  console.error(
    'Faltan env vars en apps/web/.env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL, DATABASE_URL',
  )
  process.exit(1)
}

// Resolver el email del customer.
const sql = postgres(dbUrl, { max: 1, prepare: false })
let email: string
try {
  const rows = await sql<Array<{ email: string }>>`
    SELECT email FROM customers WHERE id = ${customerId} LIMIT 1`
  if (!rows[0]) {
    console.error(`No existe customer ${customerId}.`)
    process.exit(1)
  }
  email = rows[0].email
} finally {
  await sql.end({ timeout: 5 })
}

// Asegura que el user de Supabase tenga `role: customer` en su metadata
// (signInWithOtp NO lo sobreescribe si el user ya existe). Sin esto,
// verifyMagicLink lo rechazaría con InvalidMagicLinkError.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
if (listErr) {
  console.error('listUsers falló:', listErr.message)
  process.exit(1)
}
const existing = list.users.find((u) => u.email === email)
if (existing) {
  await supabase.auth.admin.updateUserById(existing.id, {
    user_metadata: { role: 'customer' },
  })
} else {
  await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: 'customer' },
  })
}

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email,
})
const props = data?.properties
if (error || !props) {
  console.error('generateLink falló:', error?.message ?? 'sin properties')
  process.exit(1)
}

const callback = `${appUrl.replace(/\/$/, '')}/api/auth/customer/callback`
const url = `${callback}?token_hash=${props.hashed_token}&type=magiclink&customer_id=${customerId}`
console.log(`\nMagic link para customer ${email} (un solo uso, ~1h):\n`)
console.log(url)
console.log('')
