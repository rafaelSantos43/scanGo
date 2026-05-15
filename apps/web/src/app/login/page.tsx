import { LoginForm } from './LoginForm'

// Mensajes para cuando el callback redirige aqui con ?error=...
const ERROR_MESSAGES: Record<string, string> = {
  expired: 'El enlace caducó o ya fue usado. Pide uno nuevo.',
  not_admin: 'Esta cuenta no es administradora de ningún negocio.',
  invalid_link: 'El enlace no es válido.',
  unknown: 'Algo salió mal. Intenta de nuevo.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.unknown!)
    : null

  return (
    <main className="flex flex-1 w-full items-center justify-center px-6 py-16 bg-background text-foreground">
      <LoginForm initialError={errorMessage} />
    </main>
  )
}
