import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = ReturnType<typeof createDb>

type TransactionCallback = Parameters<Database['transaction']>[0]
export type DrizzleTx = Parameters<TransactionCallback>[0]

export type DbOrTx = Database | DrizzleTx

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 10, prepare: false })
  return drizzle(client, { schema })
}
