'use client'

import { Copy, Check } from 'lucide-react'
import { useActionState, useState } from 'react'
import { initialIssueState } from './action-state'
import { issueApiKeyAction } from './actions'

export function IssueApiKeyForm() {
  const [state, formAction, isPending] = useActionState(
    issueApiKeyAction,
    initialIssueState,
  )
  const [copied, setCopied] = useState(false)

  async function copy(): Promise<void> {
    if (state.status !== 'success') return
    await navigator.clipboard.writeText(state.plainKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
    >
      <h2 className="text-lg font-semibold">Emitir nueva API key</h2>
      <p className="text-sm text-muted-foreground">
        Una key sirve para que un sistema externo se autentique contra{' '}
        <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">/v1</code>.
        El valor en claro se muestra <strong>una sola vez</strong>: guárdalo
        en sitio seguro.
      </p>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Scope</legend>
        <label className="flex items-start gap-3 rounded-md border border-border px-3 py-2 cursor-pointer">
          <input type="radio" name="scope" value="write" defaultChecked />
          <span className="flex flex-col">
            <span className="text-sm font-medium">Write</span>
            <span className="text-xs text-muted-foreground">
              Lectura + escritura (crear clientes, asignar paquetes, generar QRs).
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-md border border-border px-3 py-2 cursor-pointer">
          <input type="radio" name="scope" value="read" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">Read</span>
            <span className="text-xs text-muted-foreground">
              Solo lectura. No autoriza mutaciones.
            </span>
          </span>
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Emitiendo...' : 'Emitir key'}
      </button>

      {state.status === 'success' && (
        <div className="flex flex-col gap-2 rounded-md border border-success bg-surface p-3">
          <p className="text-sm font-medium text-success">
            Key emitida — cópiala ahora, no se vuelve a mostrar.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-sm bg-muted px-2 py-1.5 font-mono text-xs">
              {state.plainKey}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
              aria-label="Copiar"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Scope: <strong>{state.scope}</strong> · Prefijo:{' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono">
              {state.prefix}
            </code>
          </p>
        </div>
      )}
    </form>
  )
}
