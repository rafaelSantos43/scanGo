import type { Timezone } from '@/domain/value-objects/Timezone'

export function formatDateInTimezone(date: Date, timezone: Timezone): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone.value,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(date)
}
