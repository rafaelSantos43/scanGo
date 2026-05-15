'use client'

import { useActionState, useEffect, useRef } from 'react'
import { initialActionState } from './action-state'
import { createCustomerAction } from './actions'

const inputClass =
  'h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

export function CreateCustomerForm() {
  const [state, formAction, isPending] = useActionState(
    createCustomerAction,
    initialActionState,
  )
  const formRef = useRef<HTMLFormElement>(null)

  // Limpiar el form tras un alta exitosa (sync al DOM, no fetching).
  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  const fieldError = (name: string): string | undefined =>
    state.status === 'error' ? state.fieldErrors?.[name] : undefined

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
    >
      <h2 className="text-lg font-semibold">Nuevo cliente</h2>

      {state.status === 'success' && (
        <p className="text-sm text-success">{state.message}</p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="fullName" className="text-sm font-medium">
          Nombre completo
        </label>
        <input id="fullName" name="fullName" type="text" required className={inputClass} />
        {fieldError('fullName') && (
          <span className="text-xs text-danger">{fieldError('fullName')}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
        {fieldError('email') && (
          <span className="text-xs text-danger">{fieldError('email')}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium">
          Teléfono <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input id="phone" name="phone" type="tel" className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Crear cliente'}
      </button>
    </form>
  )
}
