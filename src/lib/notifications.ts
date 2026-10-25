/**
 * Deadline email reminders — the client-side half.
 *
 * The digest itself is sent by a scheduled Cloud Function (`functions/`),
 * because a browser cannot email you while the app is closed. What the app
 * owns is the preference it stores on the profile: the recipient address,
 * on/off, and how many days ahead to warn. These helpers keep that small
 * surface consistent and validated.
 */

export const DEFAULT_LEAD_DAYS = 3

/** Lead-time choices offered in Settings. */
export const LEAD_DAY_OPTIONS = [1, 2, 3, 5, 7] as const

/**
 * Practical email check: one `@`, a dotted domain, no spaces. The real
 * validation is delivery, so this only catches typos.
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  if (/\s/.test(trimmed)) return false
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)
}

/** Clamp a stored lead-days value into the range the function honors. */
export function normalizeLeadDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LEAD_DAYS
  return Math.min(14, Math.max(1, Math.round(value)))
}
