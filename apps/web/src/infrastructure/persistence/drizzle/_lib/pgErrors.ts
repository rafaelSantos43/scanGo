export const PG_UNIQUE_VIOLATION = '23505'

/**
 * Detecta una violacion de constraint UNIQUE de Postgres.
 *
 * Drizzle envuelve los errores de query en `DrizzleQueryError` y deja el
 * error real de postgres-js dentro de `.cause`. Esta funcion camina la
 * cadena de `cause` hasta encontrar un objeto con `code` y
 * `constraint_name` que coincidan.
 */
export function isUniqueViolation(err: unknown, constraint: string): boolean {
  let current: unknown = err
  for (let depth = 0; depth < 4; depth++) {
    if (current === null || typeof current !== 'object') return false
    const e = current as {
      code?: unknown
      constraint_name?: unknown
      cause?: unknown
    }
    if (
      e.code === PG_UNIQUE_VIOLATION &&
      e.constraint_name === constraint
    ) {
      return true
    }
    if (e.cause === undefined) return false
    current = e.cause
  }
  return false
}
