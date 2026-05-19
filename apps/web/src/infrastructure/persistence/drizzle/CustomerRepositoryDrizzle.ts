import type { Customer } from '@/domain/entities/Customer'
import type {
  CustomerListItem,
  CustomerRepository,
} from '@/domain/repositories/CustomerRepository'
import { CustomerEmailAlreadyExistsError } from '@/domain/errors/CustomerEmailAlreadyExistsError'
import type { Email } from '@/domain/value-objects/Email'
import type { BusinessId, CustomerId } from '@/domain/value-objects/ids'
import { and, asc, eq } from 'drizzle-orm'
import type { DbOrTx } from './client'
import { CustomerMapper } from './mappers/CustomerMapper'
import { customers, packages } from './schema'
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

  async update(customer: Customer, businessId: BusinessId): Promise<void> {
    if (customer.businessId !== businessId) {
      throw new Error('Customer businessId does not match expected businessId')
    }
    try {
      await this.db
        .update(customers)
        .set({
          fullName: customer.fullName,
          email: customer.email.value,
          phone: customer.phone,
          status: customer.status,
        })
        .where(
          and(
            eq(customers.id, customer.id),
            eq(customers.businessId, businessId),
          ),
        )
    } catch (err) {
      if (isUniqueViolation(err, EMAIL_UNIQUE_CONSTRAINT)) {
        throw new CustomerEmailAlreadyExistsError(customer.email.value)
      }
      throw err
    }
  }

  async listByBusinessWithActivePackage(
    businessId: BusinessId,
  ): Promise<CustomerListItem[]> {
    // El filtro packages.status='active' va DENTRO del leftJoin: si fuera
    // al where, excluiria a los clientes sin paquete. El indice parcial
    // one_active_package_per_customer garantiza <=1 fila activa por
    // cliente, asi que el join no multiplica filas.
    const rows = await this.db
      .select({
        customerId: customers.id,
        fullName: customers.fullName,
        email: customers.email,
        phone: customers.phone,
        status: customers.status,
        packageId: packages.id,
        packageTotal: packages.totalVisits,
        packageRemaining: packages.remainingVisits,
        packageStatus: packages.status,
      })
      .from(customers)
      .leftJoin(
        packages,
        and(
          eq(packages.customerId, customers.id),
          eq(packages.status, 'active'),
        ),
      )
      .where(eq(customers.businessId, businessId))
      .orderBy(asc(customers.fullName))

    return rows.map((r) => ({
      customerId: r.customerId,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      status: r.status as 'active' | 'disabled',
      activePackage: r.packageId
        ? {
            packageId: r.packageId,
            totalVisits: r.packageTotal!,
            remainingVisits: r.packageRemaining!,
            status: r.packageStatus as 'active' | 'depleted' | 'expired',
          }
        : null,
    }))
  }
}
