import type { DateFormat } from '../types'
import { daysBetween, startOfDay, toISODate } from './dates'

const pesoFormatter = (() => {
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      currencyDisplay: 'narrowSymbol',
    })
  } catch {
    return null
  }
})()

/**
 * Format an amount as Philippine pesos (₱1,234.50).
 *
 * `Intl` currency output varies slightly across engines (some print the
 * "PHP" code instead of the ₱ symbol), so we fall back to a manual symbol
 * with Intl decimal grouping when that happens. The result is identical
 * everywhere: sign, ₱ prefix, thousands separators, two decimals.
 */
export function formatPHP(amount: number): string {
  const negative = amount < 0
  const abs = Math.abs(amount)
  let out: string

  if (pesoFormatter) {
    const candidate = pesoFormatter.format(abs)
    out = candidate.includes('₱')
      ? candidate
      : `₱${new Intl.NumberFormat('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(abs)}`
  } else {
    out = `₱${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs)}`
  }

  return negative ? `-${out}` : out
}

/** Seconds → compact duration: "45m", "1h 30m", "2h". */
export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

/**
 * A due date as a human, relative label with a fixed reference day.
 * Dates beyond two weeks render in the user's chosen date format.
 */
export function formatDueDate(iso: string, now: Date, dateFormat: DateFormat = 'YYYY-MM-DD'): string {
  const diff = daysBetween(startOfDay(now), startOfDay(parseLocal(iso)))

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return '1 day overdue'
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff <= 14) return `in ${diff} days`

  return formatDate(parseLocal(iso), dateFormat)
}

/** Format a calendar date using the user's preferred display format. */
export function formatDate(date: Date, format: DateFormat): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'YYYY-MM-DD':
    default:
      return toISODate(date)
  }
}

/**
 * Time-of-day greeting, e.g. "Good evening". When a IANA time zone is
 * provided the hour is evaluated in that zone (the profile preference).
 */
export function greetingFor(now: Date, timeZone?: string): string {
  let hour = now.getHours()
  if (timeZone) {
    try {
      hour = Number(
        new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now),
      )
    } catch {
      // Unknown zone: fall back to the host's local hour.
    }
  }
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Dashboard header date: weekday plus the user's chosen date format, e.g.
 * "Saturday, 2026-10-24". When a IANA time zone is provided, the calendar
 * day is evaluated in that zone; unknown zones fall back to the host.
 */
export function formatLongDate(
  date: Date,
  dateFormat: DateFormat = 'YYYY-MM-DD',
  timeZone?: string,
): string {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long',
      }).formatToParts(date)
      const part = (type: string): string =>
        parts.find((piece) => piece.type === type)?.value ?? ''
      const zoned = new Date(Number(part('year')), Number(part('month')) - 1, Number(part('day')))
      return `${part('weekday')}, ${formatDate(zoned, dateFormat)}`
    } catch {
      // Unknown zone: fall back to the host's local date below.
    }
  }
  return `${WEEKDAYS_FULL[date.getDay()]}, ${formatDate(date, dateFormat)}`
}

/** Relative label for "last updated" timestamps: "Today", "Yesterday", "5 days ago". */
export function formatRelativeTimestamp(iso: string, now: Date): string {
  const then = new Date(iso)
  const diff = daysBetween(startOfDay(now), startOfDay(then))
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff < -1 && diff > -14) return `${Math.abs(diff)} days ago`
  return `${then.getDate()} ${MONTH_SHORT[then.getMonth()]}`
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const WEEKDAYS_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

function parseLocal(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
