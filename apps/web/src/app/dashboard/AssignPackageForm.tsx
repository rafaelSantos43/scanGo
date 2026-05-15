'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { CustomerListItem } from '@/domain/repositories/CustomerRepository'
import { initialActionState } from './action-state'
import { assignPackageAction } from './actions'

const inputClass =
  'h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

export function AssignPackageForm({
  customers,
}: {
  customers: CustomerListItem[]
}) {
  const [state, formAction, isPending] = useActionState(
    assignPackageAction,
    initialActionState,
  )
  const formRef = useRef<HTMLFormElement>(null)

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
      <h2 className="text-lg font-semibold">Asignar paquete</h2>

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Primero da de alta un cliente.
        </p>
      ) : (
        <>
          {state.status === 'success' && (
            <p className="text-sm text-success">{state.message}</p>
          )}
          {state.status === 'error' && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="customerId" className="text-sm font-medium">
              Cliente
            </label>
            <select
              id="customerId"
              name="customerId"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona un cliente
              </option>
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.fullName}
                </option>
              ))}
            </select>
            {fieldError('customerId') && (
              <span className="text-xs text-danger">
                {fieldError('customerId')}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="totalVisits" className="text-sm font-medium">
              Número de visitas
            </label>
            <input
              id="totalVisits"
              name="totalVisits"
              type="number"
              min={1}
              required
              className={inputClass}
            />
            {fieldError('totalVisits') && (
              <span className="text-xs text-danger">
                {fieldError('totalVisits')}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="expiresAt" className="text-sm font-medium">
              Vence el <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Asignando...' : 'Asignar paquete'}
          </button>
        </>
      )}
    </form>
  )
}
