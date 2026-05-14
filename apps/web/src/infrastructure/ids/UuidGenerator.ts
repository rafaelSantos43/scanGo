import type { IdGenerator } from '@/domain/services/IdGenerator'

export class UuidGenerator implements IdGenerator {
  uuid(): string {
    return crypto.randomUUID()
  }
}
