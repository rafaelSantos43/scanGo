'use client'

import { useActionState } from 'react'
import { initialActionState } from '../action-state'
import { revokeApiKeyAction } from './actions'

export interface ApiKeyRowItem {
  id: string
  prefix: string
  scope: 'read' | 'write'
  createdAt: string
  revokedAt: string | null
}

export function ApiKeyRow({ apiKey }: { apiKey: ApiKeyRowItem }) {
  const [state, formAction, isPending] = useActionState(
    revokeApiKeyAction,
    initialActionState,
  )

  const revoked = apiKey.revokedAt !== null

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <code className="rounded-sm bg-muted px-2 py-1 font-mono text-sm">
            {apiKey.prefix}…
          </code>
          <span className="rounded-sm border border-border px-2 py-0.5 text-xs uppercase tracking-wide">
            {apiKey.scope}
          </span>
          {revoked && (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Revocada
            </span>
          )}
        </div>

        {!revoked && (
          <form action={formAction}>
            <input type="hidden" name="apiKeyId" value={apiKey.id} />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-danger hover:bg-muted disabled:opacity-50"
            >
              {isPending ? 'Revocando...' : 'Revocar'}
            </button>
          </form>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Creada el{' '}
        {new Date(apiKey.createdAt).toLocaleDateString('es', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
        {revoked && apiKey.revokedAt && (
          <>
            {' · revocada el '}
            {new Date(apiKey.revokedAt).toLocaleDateString('es', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </>
        )}
      </p>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </li>
  )
}
