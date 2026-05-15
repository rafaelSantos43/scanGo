import { redirect } from 'next/navigation'
import {
  getAdminAuthContext,
  type AdminAuthContext,
} from '@/app/api/_lib/authContext'
import { runListCustomersWithPackage } from '@/infrastructure/composition'
import { AssignPackageForm } from '../AssignPackageForm'
import { CreateCustomerForm } from '../CreateCustomerForm'

/**
 * Clientes del negocio: lista con el paquete activo de cada uno, más los
 * formularios de alta de cliente y asignación de paquete.
 */
export default async function ClientesPage() {
  let auth: AdminAuthContext
  try {
    auth = await getAdminAuthContext()
  } catch {
    redirect('/login')
  }

  const { customers } = await runListCustomersWithPackage({
    businessId: auth.businessId,
  })

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <CreateCustomerForm />
        <AssignPackageForm customers={customers} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Lista de clientes ({customers.length})
        </h2>
        {customers.length === 0 ? (
          <p className="text-base text-muted-foreground">
            Aún no hay clientes. Da de alta el primero arriba.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {customers.map((c) => (
              <li
                key={c.customerId}
                className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{c.fullName}</span>
                  <span className="text-sm text-muted-foreground">
                    {c.email}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </span>
                </div>
                <span className="text-sm tabular-nums">
                  {c.activePackage
                    ? `${c.activePackage.remainingVisits}/${c.activePackage.totalVisits} visitas`
                    : 'Sin paquete'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
