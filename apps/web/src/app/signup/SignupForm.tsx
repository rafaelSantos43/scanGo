'use client'

import { useActionState } from 'react'
import { initialActionState } from './action-state'
import { registerBusinessAction } from './actions'

const inputClass =
  'h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'

// Zonas horarias frecuentes en LatAm. La opción "Otro" la dejamos
// fuera en v1 — el dueño puede contactar para una zona menos común.
const TIMEZONES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'America/Bogota', label: 'Colombia / Perú / Ecuador (UTC-5)' },
  { value: 'America/Mexico_City', label: 'México (UTC-6)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (UTC-3)' },
  { value: 'America/Santiago', label: 'Chile (UTC-3/UTC-4)' },
  { value: 'America/Caracas', label: 'Venezuela (UTC-4)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (UTC-3)' },
  { value: 'America/Montevideo', label: 'Uruguay (UTC-3)' },
]

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    registerBusinessAction,
    initialActionState,
  )

  if (state.status === 'success') {
    return (
      <div className="flex w-full max-w-md flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          ¡Listo! Revisa tu correo.
        </h1>
        <p className="text-sm text-muted-foreground">
          Te enviamos un enlace de acceso a{' '}
          <span className="text-foreground">{state.email}</span>. Ábrelo en
          este mismo dispositivo para entrar a tu dashboard.
        </p>
      </div>
    )
  }

  const fieldError = (name: string): string | undefined =>
    state.status === 'error' ? state.fieldErrors?.[name] : undefined

  return (
    <form
      action={formAction}
      className="flex w-full max-w-md flex-col gap-4"
    >
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Crea tu cuenta de Scan&amp;Go
        </h1>
        <p className="text-sm text-muted-foreground">
          Tarda menos de un minuto. Te enviamos un enlace de acceso por correo.
        </p>
      </header>

      {state.status === 'error' && (
        <p
          role="alert"
          className="rounded-md border border-danger bg-surface px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="ownerEmail" className="text-sm font-medium">
          Tu correo electrónico
        </label>
        <input
          id="ownerEmail"
          name="ownerEmail"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
        {fieldError('ownerEmail') && (
          <span className="text-xs text-danger">{fieldError('ownerEmail')}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="businessName" className="text-sm font-medium">
          Nombre del negocio
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          placeholder="Gimnasio María"
          className={inputClass}
        />
        {fieldError('businessName') && (
          <span className="text-xs text-danger">
            {fieldError('businessName')}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="businessSlug" className="text-sm font-medium">
          Identificador
        </label>
        <input
          id="businessSlug"
          name="businessSlug"
          type="text"
          required
          placeholder="gym-maria"
          className={inputClass}
        />
        <span className="text-xs text-muted-foreground">
          Será tu URL pública: scango.com/b/<strong>{'<identificador>'}</strong>.
          Solo minúsculas, números y guiones.
        </span>
        {fieldError('businessSlug') && (
          <span className="text-xs text-danger">
            {fieldError('businessSlug')}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="businessType" className="text-sm font-medium">
          Tipo de negocio
        </label>
        <select
          id="businessType"
          name="businessType"
          required
          defaultValue="gym"
          className={inputClass}
        >
          <option value="gym">Gimnasio</option>
          <option value="academy">Academia</option>
          <option value="coworking">Coworking</option>
          <option value="other">Otro</option>
        </select>
        {fieldError('businessType') && (
          <span className="text-xs text-danger">
            {fieldError('businessType')}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className="text-sm font-medium">
          Zona horaria
        </label>
        <select
          id="timezone"
          name="timezone"
          required
          defaultValue="America/Bogota"
          className={inputClass}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Define a qué hora cuenta cada día (la regla de "una visita por día"
          usa esta zona).
        </span>
        {fieldError('timezone') && (
          <span className="text-xs text-danger">{fieldError('timezone')}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Creando...' : 'Crear cuenta'}
      </button>
    </form>
  )
}
