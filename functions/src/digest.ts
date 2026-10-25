/**
 * Deadline digest: which academic items belong in today's email, and what
 * that email says.
 *
 * Deliberately dependency-free (no Firebase, no nodemailer) so the logic can
 * be unit-tested by the root Vitest suite — `src` and `functions` share the
 * same "pure logic is testable" rule.
 */

export type DigestKind = 'assignment' | 'exam' | 'milestone'
export type DigestPriority = 'low' | 'medium' | 'high'

/** The fields the digest reads from an `academicItems` document. */
export interface DigestSourceItem {
  title: string
  kind: DigestKind
  dueDate: string | null
  priority: DigestPriority
  subjectId: string | null
}

export interface DigestEntry {
  title: string
  kind: DigestKind
  priority: DigestPriority
  /** `YYYY-MM-DD`. */
  dueDate: string
  /** Subject name, or `''` when the item has no subject. */
  subject: string
  /** Negative when the deadline has passed. */
  daysUntil: number
}

export interface DigestGroup {
  dueSoon: DigestEntry[]
  overdue: DigestEntry[]
}

/** Keep the email readable even if a lot is late. */
const MAX_PER_SECTION = 10

const KIND_LABELS: Record<DigestKind, string> = {
  assignment: 'Assignment',
  exam: 'Exam',
  milestone: 'Milestone',
}

/**
 * Calendar date in a specific IANA time zone as `YYYY-MM-DD`, so "today" in
 * the email matches the user's day (the function runs in Asia/Manila).
 */
export function isoDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`), DST-safe via UTC. */
export function daysBetweenISO(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const end = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((end - start) / 86_400_000)
}

/** Human date for the email body, e.g. `Wed, 28 Oct 2026`. */
export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

/** "today", "tomorrow", "in 4 days", "2 days overdue". */
export function relativeLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'today'
  if (daysUntil === 1) return 'tomorrow'
  if (daysUntil > 0) return `in ${daysUntil} days`
  if (daysUntil === -1) return '1 day overdue'
  return `${Math.abs(daysUntil)} days overdue`
}

/**
 * Split open academic items into "due within the lead window" and "already
 * overdue". Items without a due date are ignored; both lists are sorted by
 * due date and capped.
 */
export function selectDeadlines(
  items: DigestSourceItem[],
  todayISO: string,
  leadDays: number,
  subjectNames: ReadonlyMap<string, string> | Record<string, string> = new Map(),
): DigestGroup {
  const lookUp = (id: string | null): string => {
    if (!id) return ''
    if (subjectNames instanceof Map) return subjectNames.get(id) ?? ''
    return (subjectNames as Record<string, string>)[id] ?? ''
  }

  const dueSoon: DigestEntry[] = []
  const overdue: DigestEntry[] = []

  for (const item of items) {
    if (!item.dueDate) continue
    const daysUntil = daysBetweenISO(todayISO, item.dueDate)
    if (daysUntil > leadDays) continue

    const entry: DigestEntry = {
      title: item.title,
      kind: item.kind,
      priority: item.priority,
      dueDate: item.dueDate,
      subject: lookUp(item.subjectId),
      daysUntil,
    }
    if (daysUntil < 0) overdue.push(entry)
    else dueSoon.push(entry)
  }

  const byDueDate = (a: DigestEntry, b: DigestEntry): number =>
    a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)

  return {
    dueSoon: dueSoon.sort(byDueDate).slice(0, MAX_PER_SECTION),
    overdue: overdue.sort(byDueDate).slice(0, MAX_PER_SECTION),
  }
}

export interface DigestRenderOptions {
  /** First name (or full name) for the greeting. */
  name: string
  todayISO: string
  leadDays: number
  /** Optional link back to the planner. */
  appUrl?: string
}

export interface DigestMessage {
  subject: string
  text: string
  html: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function entryLine(entry: DigestEntry): string {
  const kind = KIND_LABELS[entry.kind]
  const subject = entry.subject ? ` (${entry.subject})` : ''
  return `${entry.title}${subject} — ${kind}, ${formatDisplayDate(entry.dueDate)} · ${relativeLabel(entry.daysUntil)}`
}

/**
 * Build the email. Returns null when there is nothing to say, so the
 * function never sends an empty reminder.
 */
export function renderDigest(
  group: DigestGroup,
  options: DigestRenderOptions,
): DigestMessage | null {
  const total = group.dueSoon.length + group.overdue.length
  if (total === 0) return null

  const leadLabel = `${options.leadDays} ${options.leadDays === 1 ? 'day' : 'days'}`
  const subjectParts: string[] = []
  if (group.dueSoon.length > 0) subjectParts.push(`${group.dueSoon.length} due soon`)
  if (group.overdue.length > 0) subjectParts.push(`${group.overdue.length} overdue`)
  const subject = `LifeOS — ${subjectParts.join(' · ')}`

  const textLines: string[] = [
    `Hi ${options.name},`,
    '',
    `Here is your academic planner for ${formatDisplayDate(options.todayISO)}.`,
  ]
  if (group.dueSoon.length > 0) {
    textLines.push('', `Due in the next ${leadLabel}:`)
    for (const entry of group.dueSoon) textLines.push(`• ${entryLine(entry)}`)
  }
  if (group.overdue.length > 0) {
    textLines.push('', 'Overdue and still open:')
    for (const entry of group.overdue) textLines.push(`• ${entryLine(entry)}`)
  }
  if (options.appUrl) {
    textLines.push('', `Open your planner: ${options.appUrl}`)
  }
  textLines.push('', 'You can turn these reminders off in LifeOS → Settings → Email reminders.')

  const section = (heading: string, entries: DigestEntry[]): string =>
    entries.length === 0
      ? ''
      : `<h2 style="font-size:14px;margin:20px 0 8px;color:#14171a;">${escapeHtml(heading)}</h2>
         <ul style="margin:0;padding-left:18px;">
           ${entries
             .map(
               (entry) =>
                 `<li style="margin:6px 0;color:#14171a;">${escapeHtml(entry.title)}${
                   entry.subject ? ` <span style="color:#59616d;">(${escapeHtml(entry.subject)})</span>` : ''
                 } — ${escapeHtml(KIND_LABELS[entry.kind])}, ${escapeHtml(formatDisplayDate(entry.dueDate))}
                 <span style="color:#59616d;">· ${escapeHtml(relativeLabel(entry.daysUntil))}</span></li>`,
             )
             .join('')}
         </ul>`

  const html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:1.6;color:#14171a;background:#f5f6f8;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e0e4ea;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:16px;font-weight:600;">Hi ${escapeHtml(options.name)},</p>
      <p style="margin:0;color:#59616d;">Your academic planner for ${escapeHtml(formatDisplayDate(options.todayISO))}.</p>
      ${section(`Due in the next ${leadLabel}`, group.dueSoon)}
      ${section('Overdue and still open', group.overdue)}
      ${
        options.appUrl
          ? `<p style="margin:22px 0 0;"><a href="${escapeHtml(options.appUrl)}" style="color:#2563eb;">Open your planner</a></p>`
          : ''
      }
      <p style="margin:22px 0 0;color:#59616d;font-size:12px;">Turn these reminders off in LifeOS → Settings → Email reminders.</p>
    </div>
  </div>`

  return { subject, text: textLines.join('\n'), html }
}
