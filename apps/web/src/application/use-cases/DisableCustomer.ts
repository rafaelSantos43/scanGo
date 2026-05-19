import type { Customer } from '@/domain/entities/Customer'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { BusinessId, CustomerId } from '@/domain/value-objects/ids'

export interface DisableCustomerInput {
  customerId: CustomerId
  businessId: BusinessId
}

export interface DisableCustomerResult {
  customer: Customer
}

export class DisableCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: DisableCustomerInput): Promise<DisableCustomerResult> {
    const customer = await this.customers.findById(
      input.customerId,
      input.businessId,
    )
    if (!customer) throw new CustomerNotFoundError(input.customerId)

    customer.disable()
    await this.customers.update(customer, input.businessId)

    return { customer }
  }
}
