export interface ApiKeyHasher {
  /** Hashea el valor en claro de una API key (argon2id en la impl real). */
  hash(plainKey: string): Promise<string>

  /** Verifica un valor en claro contra un hash almacenado. */
  verify(plainKey: string, hash: string): Promise<boolean>
}
