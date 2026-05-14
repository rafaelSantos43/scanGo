/**
 * Diagnostico de conexion a la DB. Imprime errores crudos de postgres-js
 * que drizzle-kit a veces oculta detras de su spinner.
 *
 * Uso: cd apps/web && bun run scripts/test-db.ts
 */

import postgres from 'postgres'

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL no esta definido. Configura apps/web/.env.local')
    process.exit(1)
  }

  // Imprime la URL ofuscando la password.
  const safeUrl = url.replace(/:([^:@/]+)@/, ':***@')
  console.log('Connection string:', safeUrl)

  console.log('Intentando conectar...')
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 })

  try {
    const rows = await sql<Array<{ ok: number; version: string }>>`
      select 1 as ok, version() as version
    `
    console.log('OK. Postgres respondio:', rows[0])
  } catch (err) {
    console.error('Error completo de postgres-js:')
    console.error(err)
    if (err instanceof Error) {
      console.error('Mensaje:', err.message)
      const anyErr = err as Error & {
        code?: string
        errno?: string
        address?: string
        port?: number
      }
      if (anyErr.code) console.error('Code:', anyErr.code)
      if (anyErr.errno) console.error('Errno:', anyErr.errno)
      if (anyErr.address) console.error('Address:', anyErr.address)
      if (anyErr.port) console.error('Port:', anyErr.port)
    }
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('Fallo no esperado:', err)
  process.exit(1)
})
