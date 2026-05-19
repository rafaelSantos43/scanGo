import { redirect } from 'next/navigation'
import {
  getAdminAuthContext,
  type AdminAuthContext,
} from '@/app/api/_lib/authContext'
import { runListApiKeys } from '@/infrastructure/composition'
import { ApiKeyRow, type ApiKeyRowItem } from './ApiKeyRow'
import { IssueApiKeyForm } from './IssueApiKeyForm'

/**
 * Panel de API keys del negocio (CU-07). Emite y revoca keys que usan
 * integradores externos contra `/v1`. El valor en claro solo se muestra
 * UNA vez tras la emisión (ver IssueApiKeyForm).
 */
export default async function ApiKeysPage() {
  let auth: AdminAuthContext
  try {
    auth = await getAdminAuthContext()
  } catch {
    redirect('/login')
  }

  const { apiKeys } = await runListApiKeys({ businessId: auth.businessId })

  const items: ApiKeyRowItem[] = apiKeys.map((k) => ({
    id: k.id,
    prefix: k.prefix,
    scope: k.scope,
    createdAt: k.createdAt.toISOString(),
    revokedAt: k.revokedAt?.toISOString() ?? null,
  }))
  const activeCount = items.filter((k) => k.revokedAt === null).length

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <IssueApiKeyForm />

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            Keys ({activeCount} activas{' '}
            {items.length > activeCount && (
              <span className="text-sm font-normal text-muted-foreground">
                · {items.length - activeCount} revocadas
              </span>
            )}
            )
          </h2>
          {items.length === 0 ? (
            <p className="text-base text-muted-foreground">
              Aún no hay keys. Emite la primera con el formulario.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((k) => (
                <ApiKeyRow key={k.id} apiKey={k} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
