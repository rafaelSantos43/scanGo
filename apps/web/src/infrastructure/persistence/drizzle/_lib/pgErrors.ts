export const PG_UNIQUE_VIOLATION = '23505'

export function isUniqueViolation(err: unknown, constraint: string): boolean {
  if (err === null || typeof err !== 'object') return false
  const e = err as { code?: unknown; constraint_name?: unknown }
  return e.code === PG_UNIQUE_VIOLATION && e.constraint_name === constraint
}
