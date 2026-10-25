/**
 * Small date utilities built on the local calendar (not UTC), so "today" means
 * the user's today. Kept dependency-free on purpose: the app only needs a
 * handful of operations.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1)
  return result
}

/** Local calendar date as `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

/** Parse `YYYY-MM-DD` as a local date (no UTC shift). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** A real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30 etc.). */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = parseISODate(value)
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value
}

/**
 * First day of the week containing `date`.
 * Weeks start on Monday (ISO 8601), which the charts and statistics assume.
 */
export function startOfWeek(date: Date): Date {
  const result = startOfDay(date)
  const weekday = result.getDay() // 0 = Sunday … 6 = Saturday
  const daysSinceMonday = (weekday + 6) % 7
  result.setDate(result.getDate() - daysSinceMonday)
  return result
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}
