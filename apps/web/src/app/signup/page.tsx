import { SignupForm } from './SignupForm'

/**
 * Onboarding del dueño de negocio (CU-01). Server Component que
 * renderiza el form client `SignupForm` con su Server Action.
 */
export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-16 text-foreground">
      <SignupForm />
    </main>
  )
}
