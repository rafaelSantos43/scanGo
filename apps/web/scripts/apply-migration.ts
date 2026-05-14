/**
 * Diagnostico: aplica una migracion .sql statement-by-statement e
 * imprime exactamente cual falla. Util cuando drizzle-kit migrate se
 * cae con "applying migrations..." sin mas detalle.
 *
 * Uso:
 *   # Aplica la 0000 (default):
 *   cd apps/web && bun run scripts/apply-migration.ts
 *
 *   # Aplica una migracion especifica (sin extension):
 *   cd apps/web && bun run scripts/apply-migration.ts 0001_auth_business_admins
 *
 *   # Drop tablas del flujo de escaneo antes (limpia estado parcial):
 *   cd apps/web && bun run scripts/apply-migration.ts --reset
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

const SCAN_FLOW_TABLES = [
  'attendances',
  'qr_tokens',
  'packages',
  'customers',
  'businesses',
]

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL no esta definido')
    process.exit(1)
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const reset = process.argv.includes('--reset')
  const requested = args[0]

  const migrationsDir = resolve(
    import.meta.dirname,
    '..',
    'drizzle',
    'migrations',
  )

  // Resolve cual archivo aplicar.
  let migrationFile: string
  if (requested) {
    const candidate = requested.endsWith('.sql') ? requested : `${requested}.sql`
    const allFiles = readdirSync(migrationsDir)
    if (!allFiles.includes(candidate)) {
      console.error(
        `Migracion '${candidate}' no existe en ${migrationsDir}.\n` +
          `Disponibles:\n  ${allFiles
            .filter((f) => f.endsWith('.sql'))
            .join('\n  ')}`,
      )
      process.exit(1)
    }
    migrationFile = candidate
  } else {
    migrationFile = '0000_init_scan_flow.sql'
  }

  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 })

  try {
    if (reset) {
      console.log('Reset solicitado — borrando tablas del flujo de escaneo...')
      for (const table of SCAN_FLOW_TABLES) {
        try {
          await sql.unsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`)
          console.log(`  dropped ${table}`)
        } catch (err) {
          console.error(`  fallo drop ${table}:`, (err as Error).message)
        }
      }
      console.log('Reset listo.\n')
    }

    const existing = await sql<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    console.log(
      'Tablas en public ahora:',
      existing.length === 0
        ? '(ninguna)'
        : existing.map((r) => r.tablename).join(', '),
    )
    console.log('')

    const migrationPath = resolve(migrationsDir, migrationFile)
    const content = readFileSync(migrationPath, 'utf-8')
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    console.log(
      `Aplicando ${migrationFile} (${statements.length} statements)...\n`,
    )

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]!
      const preview = stmt.split('\n')[0]!.slice(0, 80)
      try {
        await sql.unsafe(stmt)
        console.log(`  [${i + 1}/${statements.length}] OK: ${preview}`)
      } catch (err) {
        console.error(`\n  [${i + 1}/${statements.length}] FALLO: ${preview}`)
        console.error('\n  SQL completo del statement que fallo:')
        console.error('  ' + stmt.split('\n').join('\n  '))
        console.error('\n  Error de Postgres:')
        console.error('  ' + ((err as Error).message ?? String(err)))
        const pgErr = err as { code?: string; detail?: string; hint?: string }
        if (pgErr.code) console.error('  Code:', pgErr.code)
        if (pgErr.detail) console.error('  Detail:', pgErr.detail)
        if (pgErr.hint) console.error('  Hint:', pgErr.hint)
        process.exit(1)
      }
    }

    console.log(`\n${migrationFile} aplicada completa.`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('Fallo no esperado:', err)
  process.exit(1)
})
