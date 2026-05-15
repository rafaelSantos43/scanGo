import { redirect } from 'next/navigation'
import {
  getAdminAuthContext,
  type AdminAuthContext,
} from '@/app/api/_lib/authContext'
import { buildBusinessRepository } from '@/infrastructure/composition'
import { SignoutButton } from './SignoutButton'

/**
 * Landing autenticado del admin. Resuelve la sesion server-side desde la
 * cookie HttpOnly; sin sesion valida, redirige a /login. Es un placeholder
 * — el dashboard real del negocio queda para un chunk posterior.
 */
export default async function DashboardPage() {
  let auth: AdminAuthContext
  try {
    auth = await getAdminAuthContext()
  } catch {
    redirect('/login')
  }

  const business = await buildBusinessRepository().findById(
    auth.businessId,
    auth.businessId,
  )

  return (
    <main className="flex flex-1 w-full items-center justify-center px-6 py-16 bg-background text-foreground">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {business?.name ?? 'Tu negocio'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sesión de administrador iniciada.
          </p>
        </header>

        <dl className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Negocio</dt>
            <dd className="text-foreground">{auth.businessId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Usuario</dt>
            <dd className="text-foreground">{auth.userId}</dd>
          </div>
        </dl>

        <SignoutButton />
      </div>
    </main>
  )
}
