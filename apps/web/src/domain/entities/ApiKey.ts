import type { ApiKeyId, BusinessId } from '../value-objects/ids'

// RF-03: dos scopes en v1. `write` implica `read`.
export type ApiKeyScope = 'read' | 'write'

/**
 * Largo del prefijo en claro (`sg_` + 11 hex). Contrato entre quien emite
 * la key (escribe el prefijo) y el middleware de auth (lo extrae de la key
 * recibida para el lookup) — debe ser el mismo en ambos lados.
 */
export const API_KEY_PREFIX_LENGTH = 14

export interface ApiKeyProps {
  id: ApiKeyId
  businessId: BusinessId
  hashedKey: string
  prefix: string
  scope: ApiKeyScope
  createdAt: Date
  revokedAt: Date | null
}

/**
 * Credencial de un integrador externo. El valor real de la key NUNCA se
 * guarda — solo su hash argon2id (`hashedKey`) y un `prefix` en claro
 * para mostrarlo en el panel y para el lookup del middleware de auth.
 */
export class ApiKey {
  readonly id: ApiKeyId
  readonly businessId: BusinessId
  readonly hashedKey: string
  readonly prefix: string
  readonly scope: ApiKeyScope
  readonly createdAt: Date
  private _revokedAt: Date | null

  constructor(props: ApiKeyProps) {
    this.id = props.id
    this.businessId = props.businessId
    this.hashedKey = props.hashedKey
    this.prefix = props.prefix
    this.scope = props.scope
    this.createdAt = props.createdAt
    this._revokedAt = props.revokedAt
  }

  get revokedAt(): Date | null {
    return this._revokedAt
  }

  isRevoked(): boolean {
    return this._revokedAt !== null
  }

  /** Revoca la key. Idempotente: si ya estaba revocada, conserva la fecha. */
  revoke(now: Date): void {
    if (this._revokedAt === null) {
      this._revokedAt = now
    }
  }

  /**
   * ¿La key autoriza una operación que exige `required`? Solo mira el
   * scope — que la key no esté revocada lo verifica el middleware aparte
   * (revocada = 401, scope insuficiente = 403).
   */
  allows(required: ApiKeyScope): boolean {
    return this.scope === 'write' || required === 'read'
  }
}
