import { Customer } from '@/domain/entities/Customer'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import type { BusinessRepository } from '@/domain/repositories/BusinessRepository'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import { Email } from '@/domain/value-objects/Email'
import { CustomerId, type BusinessId } from '@/domain/value-objects/ids'

export interface CreateCustomerInput {
  businessId: BusinessId
  fullName: string
  email: string
  phone?: string | null
}

export interface CreateCustomerResult {
  customer: Customer
}

export class CreateCustomerUseCase {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly customers: CustomerRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateCustomerInput): Promise<CreateCustomerResult> {
    const business = await this.businesses.findById(
      input.businessId,
      input.businessId,
    )
    if (!business) throw new BusinessNotFoundError(input.businessId)

    const customer = new Customer({
      id: CustomerId(this.ids.uuid()),
      businessId: input.businessId,
      userId: null,
      fullName: input.fullName.trim(),
      email: new Email(input.email),
      phone: input.phone?.trim() || null,
      status: 'active',
      createdAt: this.clock.now(),
    })

    await this.customers.save(customer, input.businessId)

    return { customer }
  }
}
