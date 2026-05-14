import type { Customer } from '@/domain/entities/Customer'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { Email } from '@/domain/value-objects/Email'
import type { BusinessId, CustomerId } from '@/domain/value-objects/ids'
import { and, eq } from 'drizzle-orm'
import type { Database } from './client'
import { CustomerMapper } from './mappers/CustomerMapper'
import { customers } from './schema'

export class CustomerRepositoryDrizzle implements CustomerRepository {
  constructor(private readonly db: Database) {}

  async findById(
    id: CustomerId,
    businessId: BusinessId,
  ): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
      .limit(1)
    return rows[0] ? CustomerMapper.toDomain(rows[0]) : null
  }

  async findByEmail(
    email: Email,
    businessId: BusinessId,
  ): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.email, email.value),
          eq(customers.businessId, businessId),
        ),
      )
      .limit(1)
    return rows[0] ? CustomerMapper.toDomain(rows[0]) : null
  }
}
