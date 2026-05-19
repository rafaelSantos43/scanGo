import Link from 'next/link'
import { getAdminAuthContext } from '@/app/api/_lib/authContext'
import { buildBusinessRepository } from '@/infrastructure/composition'
import { SignoutButton } from './SignoutButton'

/**
 * Shell del dashboard: header con nombre del negocio + navegación. NO
 * hace `redirect` — un layout no se re-evalúa en navegaciones cliente
 * entre rutas hijas; el chequeo de auth confiable vive en cada page.
 * Aquí la carga del nombre es tolerante a fallo.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let businessName = 'Tu negocio'
  try {
    const auth = await getAdminAuthContext()
    const business = await buildBusinessRepository().findById(
      auth.businessId,
      auth.businessId,
    )
    if (business) businessName = business.name
  } catch {
    // Sin sesión: la page hija redirige a /login.
  }

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">{businessName}</span>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Asistencias
            </Link>
            <Link
              href="/dashboard/clientes"
              className="text-muted-foreground hover:text-foreground"
            >
              Clientes
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="text-muted-foreground hover:text-foreground"
            >
              API keys
            </Link>
          </nav>
        </div>
        <SignoutButton />
      </header>
      {children}
    </div>
  )
}
