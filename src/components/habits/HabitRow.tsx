import { Archive, ArchiveRestore, Flame, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { HabitOverviewRow } from '../../lib/habit'
import { parseISODate } from '../../lib/dates'
import { Badge } from '../ui/Badge'
import { ProgressBar } from '../ui/ProgressBar'

interface HabitRowProps {
  row: HabitOverviewRow
  /** Disables the checkbox while this habit's toggle is in flight. */
  busy?: boolean
  archived?: boolean
  onToggle: (row: HabitOverviewRow) => void
  onEdit: (row: HabitOverviewRow) => void
  onSetArchived: (row: HabitOverviewRow, archived: boolean) => void
  onDelete: (row: HabitOverviewRow) => void
}

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function shortDate(iso: string): string {
  const date = parseISODate(iso)
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`
}

/**
 * One habit: a real checkbox for today (state also carried by the badge and
 * strip, never color alone), streak and period statistics, a 14-day history
 * strip with per-day accessible labels, and edit/archive/delete actions.
 */
export function HabitRow({ row, busy, archived, onToggle, onEdit, onSetArchived, onDelete }: HabitRowProps) {
  const { habit, completedToday, streak, week, monthRate, recent } = row
  const streakUnit = habit.frequency === 'daily' ? 'day' : 'week'

  return (
    <li className={cn('px-5 py-4', archived && 'opacity-75')}>
      <div className="flex items-start gap-3">
        {archived ? (
          <span className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <input
            type="checkbox"
            checked={completedToday}
            disabled={busy}
            onChange={() => onToggle(row)}
            aria-label={`Mark “${habit.name}” as ${completedToday ? 'not done' : 'done'} for today`}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent disabled:cursor-wait"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('text-sm font-medium', archived ? 'text-ink-muted' : 'text-ink')}>
              {habit.name}
            </span>
            <Badge>{habit.frequency === 'daily' ? 'Daily' : `Weekly · ${habit.targetPerPeriod}×`}</Badge>
            {archived ? <Badge>Archived</Badge> : null}
            {completedToday && !archived ? <Badge tone="success">Done today</Badge> : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Flame className={cn('h-3.5 w-3.5', streak.current > 0 ? 'text-accent' : 'text-ink-muted')} aria-hidden="true" />
              <span className="tabular-nums">{streak.current}</span> {streakUnit}
              {streak.current === 1 ? '' : 's'} streak
            </span>
            <span className="tabular-nums">
              Best: {streak.longest} {streakUnit}{streak.longest === 1 ? '' : 's'}
            </span>
            <span className="tabular-nums">
              This week: {week.done}/{week.target}
            </span>
            <span className="tabular-nums">{monthRate}% this month</span>
          </div>

          <ProgressBar
            value={week.done}
            max={week.target}
            label={`Weekly progress for “${habit.name}”`}
            className="mt-2 max-w-xs"
          />

          <div className="mt-3">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-muted">Last 14 days</p>
            <div className="flex flex-wrap gap-1">
              {recent.map((day) => (
                <span
                  key={day.iso}
                  role="img"
                  aria-label={`${shortDate(day.iso)}: ${day.done ? 'done' : 'not done'}`}
                  title={`${shortDate(day.iso)} — ${day.done ? 'done' : 'not done'}`}
                  className={cn(
                    'h-4 w-4 rounded-sm border',
                    day.done ? 'border-accent bg-accent' : 'border-line bg-surface-2',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className={ICON_BUTTON}
            title="Edit habit"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Edit “{habit.name}”</span>
          </button>
          <button
            type="button"
            onClick={() => onSetArchived(row, !archived)}
            className={ICON_BUTTON}
            title={archived ? 'Restore habit' : 'Archive habit'}
          >
            {archived ? (
              <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Archive className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">{archived ? 'Restore' : 'Archive'} “{habit.name}”</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(row)}
            className={cn(ICON_BUTTON, 'hover:bg-danger/10 hover:text-danger')}
            title="Delete habit"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Delete “{habit.name}”</span>
          </button>
        </div>
      </div>
    </li>
  )
}
