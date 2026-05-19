/**
 * Fixture de prueba: emite una API key para el gym demo y la imprime UNA
 * sola vez (el valor real no se vuelve a poder ver). Mientras no exista
 * UI de gestión de keys en el dashboard, este script es la forma de
 * obtener una key para probar el API pública `/v1`.
 *
 * Uso (desde apps/web):
 *   bun run db:seed-api-key          -> key con scope 'write'
 *   bun run db:seed-api-key read     -> key con scope 'read'
 *
 * Requiere DATABASE_URL en .env.local.
 */

import postgres from 'postgres'
import { BusinessId } from '@/domain/value-objects/ids'
import { runIssueApiKey } from '@/infrastructure/composition'

const scope = process.argv[2] === 'read' ? 'read' : 'write'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('Falta DATABASE_URL en apps/web/.env.local')
  process.exit(1)
}

// Resolver el businessId del gym demo.
const sql = postgres(dbUrl, { max: 1, prepare: false })
let businessId: string
try {
  const rows = await sql<Array<{ id: string }>>`
    SELECT id FROM businesses WHERE slug = 'demo-gym' LIMIT 1`
  if (!rows[0]) {
    console.error("No existe el negocio 'demo-gym'. Corre 'bun run db:seed'.")
    process.exit(1)
  }
  businessId = rows[0].id
} finally {
  await sql.end({ timeout: 5 })
}

const { apiKey, plainKey } = await runIssueApiKey({
  businessId: BusinessId(businessId),
  scope,
})

console.log('\nAPI key emitida — cópiala ahora, no se vuelve a mostrar:\n')
console.log(`  ${plainKey}\n`)
console.log(`  scope:  ${apiKey.scope}`)
console.log(`  prefix: ${apiKey.prefix}`)
console.log(`  id:     ${apiKey.id}`)
console.log('\nÚsala así:  Authorization: Bearer <key>')

// La pool de la composition queda abierta; salimos explícitamente.
process.exit(0)
