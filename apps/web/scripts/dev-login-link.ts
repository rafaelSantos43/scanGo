/**
 * Atajo de desarrollo: genera un magic link de login de admin y lo
 * imprime, sin pasar por el correo. Para probar el login en local.
 *
 * El email debe ser un admin ya sembrado (ver `bun run db:seed-admin`),
 * porque su metadata necesita `role: 'admin'`.
 *
 * Uso (desde apps/web):
 *   bun run dev:login-link                 -> admin@demo.com
 *   bun run dev:login-link otro@correo.com -> ese email
 *
 * Requiere en .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SUPABASE_MAGIC_LINK_REDIRECT_URL (todos del mismo proyecto Supabase).
 */

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2] ?? 'admin@demo.com'
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const callbackUrl = process.env.SUPABASE_MAGIC_LINK_REDIRECT_URL

if (!supabaseUrl || !serviceRoleKey || !callbackUrl) {
  console.error(
    'Faltan env vars en apps/web/.env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MAGIC_LINK_REDIRECT_URL',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email,
})
const props = data?.properties
if (error || !props) {
  console.error('generateLink falló:', error?.message ?? 'sin properties')
  process.exit(1)
}

// callbackUrl ya trae el esquema correcto (http/https) y el puerto.
const url = `${callbackUrl}?token_hash=${props.hashed_token}&type=magiclink`
console.log(`\nMagic link para ${email} (un solo uso, ~1h):\n`)
console.log(url)
console.log('')
