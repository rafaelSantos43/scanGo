import type { Clock } from '@/domain/services/Clock'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
