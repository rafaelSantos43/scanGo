import { Customer, type CustomerStatus } from '@/domain/entities/Customer'
import { Email } from '@/domain/value-objects/Email'
import { BusinessId, CustomerId, UserId } from '@/domain/value-objects/ids'
import type { customers } from '../schema'

type CustomerRow = typeof customers.$inferSelect
type CustomerInsert = typeof customers.$inferInsert

export class CustomerMapper {
  static toDomain(row: CustomerRow): Customer {
    return new Customer({
      id: CustomerId(row.id),
      businessId: BusinessId(row.businessId),
      userId: row.userId ? UserId(row.userId) : null,
      fullName: row.fullName,
      email: new Email(row.email),
      phone: row.phone,
      status: row.status as CustomerStatus,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(entity: Customer): CustomerInsert {
    return {
      id: entity.id,
      businessId: entity.businessId,
      userId: entity.userId,
      fullName: entity.fullName,
      email: entity.email.value,
      phone: entity.phone,
      status: entity.status,
      createdAt: entity.createdAt,
    }
  }
}
