import type { Customer } from '@/domain/entities/Customer'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { BusinessId, CustomerId } from '@/domain/value-objects/ids'

export interface EnableCustomerInput {
  customerId: CustomerId
  businessId: BusinessId
}

export interface EnableCustomerResult {
  customer: Customer
}

export class EnableCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: EnableCustomerInput): Promise<EnableCustomerResult> {
    const customer = await this.customers.findById(
      input.customerId,
      input.businessId,
    )
    if (!customer) throw new CustomerNotFoundError(input.customerId)

    customer.enable()
    await this.customers.update(customer, input.businessId)

    return { customer }
  }
}
