import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = ReturnType<typeof createDb>

type TransactionCallback = Parameters<Database['transaction']>[0]
export type DrizzleTx = Parameters<TransactionCallback>[0]

export type DbOrTx = Database | DrizzleTx

export function createDb(connectionString: string) {
  // max bajo a proposito: con el pooler de Supabase en modo transaction
  // una sola instancia de la app multiplexa de sobra; un max alto solo
  // abre mas conexiones al pooler sin ganancia. prepare:false es
  // obligatorio en modo transaction (no soporta prepared statements).
  const client = postgres(connectionString, { max: 5, prepare: false })
  return drizzle(client, { schema })
}
