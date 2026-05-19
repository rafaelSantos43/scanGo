import { hash, verify } from '@node-rs/argon2'
import type { ApiKeyHasher } from '@/domain/services/ApiKeyHasher'

/**
 * Implementación de `ApiKeyHasher` con argon2id (ARCHITECTURE §4.4 / RNF-02:
 * ganador del Password Hashing Competition, recomendación OWASP). Usa los
 * parámetros por defecto de `@node-rs/argon2`, que ya son argon2id.
 */
export class Argon2ApiKeyHasher implements ApiKeyHasher {
  hash(plainKey: string): Promise<string> {
    return hash(plainKey)
  }

  async verify(plainKey: string, hashed: string): Promise<boolean> {
    try {
      return await verify(hashed, plainKey)
    } catch {
      // `verify` lanza si el hash está malformado: lo tratamos como "no
      // coincide" en vez de propagar.
      return false
    }
  }
}
