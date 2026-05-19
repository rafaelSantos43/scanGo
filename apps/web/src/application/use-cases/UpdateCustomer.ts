import { Customer } from '@/domain/entities/Customer'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import { Email } from '@/domain/value-objects/Email'
import type { BusinessId, CustomerId } from '@/domain/value-objects/ids'

export interface UpdateCustomerInput {
  customerId: CustomerId
  businessId: BusinessId
  fullName: string
  email: string
  phone?: string | null
}

export interface UpdateCustomerResult {
  customer: Customer
}

export class UpdateCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: UpdateCustomerInput): Promise<UpdateCustomerResult> {
    const existing = await this.customers.findById(
      input.customerId,
      input.businessId,
    )
    if (!existing) throw new CustomerNotFoundError(input.customerId)

    const customer = new Customer({
      id: existing.id,
      businessId: existing.businessId,
      userId: existing.userId,
      fullName: input.fullName.trim(),
      email: new Email(input.email),
      phone: input.phone?.trim() || null,
      status: existing.status,
      createdAt: existing.createdAt,
    })

    await this.customers.update(customer, input.businessId)

    return { customer }
  }
}
