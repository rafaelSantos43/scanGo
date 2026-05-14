import { Package } from '@/domain/entities/Package'
import { CustomerDisabledError } from '@/domain/errors/CustomerDisabledError'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import { InvalidVisitCountError } from '@/domain/errors/InvalidVisitCountError'
import type { CustomerRepository } from '@/domain/repositories/CustomerRepository'
import type { PackageRepository } from '@/domain/repositories/PackageRepository'
import type { Clock } from '@/domain/services/Clock'
import type { IdGenerator } from '@/domain/services/IdGenerator'
import { VisitCount } from '@/domain/value-objects/VisitCount'
import {
  PackageId,
  type BusinessId,
  type CustomerId,
} from '@/domain/value-objects/ids'

export interface AssignPackageInput {
  customerId: CustomerId
  businessId: BusinessId
  totalVisits: number
  expiresAt?: Date | null
}

export interface AssignPackageResult {
  package: Package
}

export class AssignPackageUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly packages: PackageRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: AssignPackageInput): Promise<AssignPackageResult> {
    const customer = await this.customers.findById(
      input.customerId,
      input.businessId,
    )
    if (!customer) throw new CustomerNotFoundError(input.customerId)
    if (!customer.isActive()) throw new CustomerDisabledError(input.customerId)

    // VisitCount valida >=0; explicitamente rechazamos 0 con
    // InvalidVisitCountError porque "asignar paquete con 0 visitas" es
    // un input invalido a nivel de use case, no de dominio.
    if (input.totalVisits <= 0) {
      throw new InvalidVisitCountError(input.totalVisits)
    }

    const visits = new VisitCount(input.totalVisits)
    const pkg = new Package({
      id: PackageId(this.ids.uuid()),
      customerId: input.customerId,
      businessId: input.businessId,
      totalVisits: visits,
      remainingVisits: visits,
      status: 'active',
      purchasedAt: this.clock.now(),
      expiresAt: input.expiresAt ?? null,
    })

    await this.packages.save(pkg, input.businessId)

    return { package: pkg }
  }
}
