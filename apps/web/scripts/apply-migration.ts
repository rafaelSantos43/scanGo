/**
 * Diagnostico: aplica la migracion inicial statement-by-statement e
 * imprime exactamente cual SQL falla. Util cuando drizzle-kit migrate
 * se cae con "applying migrations..." sin mas detalle.
 *
 * Uso: cd apps/web && bun run scripts/apply-migration.ts
 *
 * Para limpiar antes (si quedo estado parcial de un intento previo):
 *   cd apps/web && bun run scripts/apply-migration.ts --reset
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

const TABLES = [
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
  const reset = process.argv.includes('--reset')

  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 })

  try {
    if (reset) {
      console.log('Reset solicitado — borrando tablas existentes...')
      for (const table of TABLES) {
        try {
          await sql.unsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`)
          console.log(`  dropped ${table}`)
        } catch (err) {
          console.error(`  fallo drop ${table}:`, (err as Error).message)
        }
      }
      console.log('Reset listo.\n')
    }

    // Lista tablas existentes para detectar estado parcial.
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

    const migrationPath = resolve(
      import.meta.dirname,
      '..',
      'drizzle',
      'migrations',
      '0000_init_scan_flow.sql',
    )
    const content = readFileSync(migrationPath, 'utf-8')
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    console.log(`Aplicando ${statements.length} statements...\n`)

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

    console.log('\nMigracion aplicada completa.')
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('Fallo no esperado:', err)
  process.exit(1)
})
