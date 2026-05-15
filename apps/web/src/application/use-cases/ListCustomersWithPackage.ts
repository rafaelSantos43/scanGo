import type {
  CustomerListItem,
  CustomerRepository,
} from '@/domain/repositories/CustomerRepository'
import type { BusinessId } from '@/domain/value-objects/ids'

export interface ListCustomersWithPackageInput {
  businessId: BusinessId
}

export interface ListCustomersWithPackageResult {
  customers: CustomerListItem[]
}

/**
 * Lista los clientes de un negocio con su paquete activo embebido, para
 * el dashboard. Wrapper fino sobre el repo — mantiene la regla de que la
 * presentación llama a application, no a infrastructure.
 */
export class ListCustomersWithPackageUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(
    input: ListCustomersWithPackageInput,
  ): Promise<ListCustomersWithPackageResult> {
    const customers = await this.customers.listByBusinessWithActivePackage(
      input.businessId,
    )
    return { customers }
  }
}
