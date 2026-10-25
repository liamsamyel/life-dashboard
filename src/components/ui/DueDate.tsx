import { TriangleAlert } from 'lucide-react'
import { usePreferences } from '../../hooks/usePreferences'
import { cn } from '../../lib/cn'
import { formatDueDate } from '../../lib/format'
import { daysBetween, parseISODate, startOfDay } from '../../lib/dates'

interface DueDateProps {
  /** `YYYY-MM-DD`, or null when there is no due date. */
  due: string | null
  now: Date
  className?: string
}

/**
 * Human due-date label. The state is spelled out in words ("Today",
 * "2 days overdue") with a warning icon for overdue items, so it never relies
 * on color alone.
 */
export function DueDate({ due, now, className }: DueDateProps) {
  // Hook runs before any early return (conditional hooks crash React).
  const { profile } = usePreferences()

  if (!due) {
    return <span className={cn('text-xs text-ink-muted', className)}>No due date</span>
  }

  const diff = daysBetween(startOfDay(now), startOfDay(parseISODate(due)))
  const overdue = diff < 0
  const today = diff === 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        overdue ? 'font-medium text-danger' : today ? 'font-medium text-accent' : 'text-ink-muted',
        className,
      )}
    >
      {overdue ? <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {formatDueDate(due, now, profile?.dateFormat ?? 'YYYY-MM-DD')}
    </span>
  )
}
