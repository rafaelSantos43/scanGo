import type { Customer } from '@/domain/entities/Customer'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import { CustomerEmailAlreadyExistsError } from '@/domain/errors/CustomerEmailAlreadyExistsError'
import type { Email } from '@/domain/value-objects/Email'
import type { BusinessId, CustomerId } from '@/domain/value-objects/ids'
import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { CustomerMapper } from './mappers/CustomerMapper'
import { customers } from './schema'
import { isUniqueViolation } from './_lib/pgErrors'

const EMAIL_UNIQUE_CONSTRAINT = 'customers_business_email_unique'

export class CustomerRepositoryDrizzle implements CustomerRepository {
  constructor(private readonly db: DbOrTx) {}

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

  async save(customer: Customer, businessId: BusinessId): Promise<void> {
    if (customer.businessId !== businessId) {
      throw new Error('Customer businessId does not match expected businessId')
    }
    const row = CustomerMapper.toPersistence(customer)
    try {
      await this.db.insert(customers).values(row)
    } catch (err) {
      if (isUniqueViolation(err, EMAIL_UNIQUE_CONSTRAINT)) {
        throw new CustomerEmailAlreadyExistsError(customer.email.value)
      }
      throw err
    }
  }
}
