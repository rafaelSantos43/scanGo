import { redirect } from 'next/navigation'
import {
  getAdminAuthContext,
  type AdminAuthContext,
} from '@/app/api/_lib/authContext'
import { runListTodayAttendances } from '@/infrastructure/composition'

/**
 * Asistencias de hoy del negocio. "Hoy" se calcula en la zona del
 * negocio dentro del use case. Sin sesión válida, redirige a /login.
 */
export default async function DashboardPage() {
  let auth: AdminAuthContext
  try {
    auth = await getAdminAuthContext()
  } catch {
    redirect('/login')
  }

  const { date, timezone, attendances } = await runListTodayAttendances({
    businessId: auth.businessId,
  })

  const timeFmt = new Intl.DateTimeFormat('es-CO', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Asistencias de hoy
        </h1>
        <p className="text-sm text-muted-foreground">{date}</p>
      </header>

      {attendances.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Nadie ha marcado asistencia hoy.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attendances.map((a) => (
            <li
              key={a.attendanceId}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3"
            >
              <span className="font-medium">{a.customerFullName}</span>
              <span className="text-sm text-muted-foreground">
                {a.locationName}
              </span>
              <span className="text-sm tabular-nums">
                {timeFmt.format(a.scannedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
