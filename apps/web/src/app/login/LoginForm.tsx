'use client'

import { useState } from 'react'

type Status = 'idle' | 'submitting' | 'sent' | 'error'

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/auth/admin/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        setStatus('error')
        setErrorMsg('No pudimos enviar el enlace. Revisa el correo e intenta de nuevo.')
        return
      }
      setStatus('sent')
    } catch {
      setStatus('error')
      setErrorMsg('No se pudo conectar. Revisa tu internet.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Si <span className="text-foreground">{email}</span> tiene una cuenta
          de administrador, te enviamos un enlace de acceso. Ábrelo en este
          mismo dispositivo.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
      <p className="text-sm text-muted-foreground">
        Te enviamos un enlace de acceso a tu correo. No necesitas contraseña.
      </p>

      {errorMsg && (
        <p
          role="alert"
          className="rounded-md border border-danger bg-surface px-3 py-2 text-sm text-danger"
        >
          {errorMsg}
        </p>
      )}

      <label htmlFor="email" className="text-sm font-medium">
        Correo electrónico
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin@tunegocio.com"
        autoComplete="email"
        className="h-11 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === 'submitting' ? 'Enviando...' : 'Enviar enlace'}
      </button>
    </form>
  )
}
