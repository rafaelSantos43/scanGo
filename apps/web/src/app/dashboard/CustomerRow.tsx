'use client'

import { useActionState, useEffect, useState } from 'react'
import type { CustomerListItem } from '@/domain/repositories/CustomerRepository'
import { initialActionState } from './action-state'
import {
  disableCustomerAction,
  enableCustomerAction,
  updateCustomerAction,
} from './actions'

const inputClass =
  'h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

export function CustomerRow({ customer }: { customer: CustomerListItem }) {
  const [editing, setEditing] = useState(false)
  const [updateState, updateAction, updatePending] = useActionState(
    updateCustomerAction,
    initialActionState,
  )
  const [disableState, disableAction, disablePending] = useActionState(
    disableCustomerAction,
    initialActionState,
  )
  const [enableState, enableAction, enablePending] = useActionState(
    enableCustomerAction,
    initialActionState,
  )

  // Cerrar el modo edición tras guardar (sync de UI, no fetching).
  useEffect(() => {
    if (updateState.status === 'success') setEditing(false)
  }, [updateState])

  const fieldError = (name: string): string | undefined =>
    updateState.status === 'error' ? updateState.fieldErrors?.[name] : undefined

  if (editing) {
    return (
      <li className="rounded-md border border-border bg-surface p-4">
        <form action={updateAction} className="flex flex-col gap-3">
          <input type="hidden" name="customerId" value={customer.customerId} />

          {updateState.status === 'error' && (
            <p role="alert" className="text-sm text-danger">
              {updateState.message}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`fullName-${customer.customerId}`}
              className="text-sm font-medium"
            >
              Nombre completo
            </label>
            <input
              id={`fullName-${customer.customerId}`}
              name="fullName"
              type="text"
              required
              defaultValue={customer.fullName}
              className={inputClass}
            />
            {fieldError('fullName') && (
              <span className="text-xs text-danger">
                {fieldError('fullName')}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`email-${customer.customerId}`}
              className="text-sm font-medium"
            >
              Correo electrónico
            </label>
            <input
              id={`email-${customer.customerId}`}
              name="email"
              type="email"
              required
              defaultValue={customer.email}
              className={inputClass}
            />
            {fieldError('email') && (
              <span className="text-xs text-danger">{fieldError('email')}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`phone-${customer.customerId}`}
              className="text-sm font-medium"
            >
              Teléfono <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id={`phone-${customer.customerId}`}
              name="phone"
              type="tel"
              defaultValue={customer.phone ?? ''}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updatePending}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {updatePending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-11 items-center justify-center rounded-md border border-border px-5 text-base font-medium hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-medium">
            {customer.fullName}
            {customer.status === 'disabled' && (
              <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                Deshabilitado
              </span>
            )}
          </span>
          <span className="text-sm text-muted-foreground">
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ''}
          </span>
        </div>
        <span className="text-sm tabular-nums">
          {customer.activePackage
            ? `${customer.activePackage.remainingVisits}/${customer.activePackage.totalVisits} visitas`
            : 'Sin paquete'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
        >
          Editar
        </button>
        {customer.status === 'active' ? (
          <form action={disableAction}>
            <input
              type="hidden"
              name="customerId"
              value={customer.customerId}
            />
            <button
              type="submit"
              disabled={disablePending}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-danger hover:bg-muted disabled:opacity-50"
            >
              {disablePending ? 'Deshabilitando...' : 'Deshabilitar'}
            </button>
          </form>
        ) : (
          <form action={enableAction}>
            <input
              type="hidden"
              name="customerId"
              value={customer.customerId}
            />
            <button
              type="submit"
              disabled={enablePending}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-success hover:bg-muted disabled:opacity-50"
            >
              {enablePending ? 'Habilitando...' : 'Habilitar'}
            </button>
          </form>
        )}
      </div>

      {disableState.status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {disableState.message}
        </p>
      )}
      {enableState.status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {enableState.message}
        </p>
      )}
    </li>
  )
}
