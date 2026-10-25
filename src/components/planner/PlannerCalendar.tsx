import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { groupByDueDate, monthCells } from '../../lib/academic'
import { toISODate } from '../../lib/dates'
import type { AcademicItem } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'

interface PlannerCalendarProps {
  /** The month being shown (only its year/month matter). */
  cursor: Date
  onCursorChange: (cursor: Date) => void
  /** Items to place on due dates (already filtered by the page's toolbar). */
  items: AcademicItem[]
  onOpenItem: (item: AcademicItem) => void
  now: Date
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

/**
 * Fixed 6-week month grid (Monday-first, matching `startOfWeek`). Each due
 * date shows up to two item chips — buttons that open the item — plus a
 * "+n more" line, so busy days stay readable instead of overflowing.
 */
export function PlannerCalendar({
  cursor,
  onCursorChange,
  items,
  onOpenItem,
  now,
}: PlannerCalendarProps) {
  const cells = useMemo(() => monthCells(cursor), [cursor])
  const groups = useMemo(() => groupByDueDate(items), [items])
  const todayISO = toISODate(now)

  const monthLabel = MONTH_LABEL.format(cursor)
  const step = (months: number): void =>
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + months, 1))

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={monthLabel}
        subtitle="Items appear on their due dates"
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        }
      />
      <CardBody className="px-3 pb-4 sm:px-5">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted"
            >
              {day}
            </div>
          ))}

          {cells.map((cell) => {
            const dayItems = groups.get(cell.isoDate) ?? []
            const isToday = cell.isoDate === todayISO
            const label = `${cell.isoDate}${dayItems.length > 0 ? `, ${dayItems.length} item${dayItems.length === 1 ? '' : 's'}` : ''}`

            return (
              <div
                key={cell.isoDate}
                aria-label={label}
                className={cn(
                  'min-h-[72px] rounded-md border p-1',
                  isToday ? 'border-accent bg-surface-2' : 'border-line bg-surface',
                  !cell.inMonth && 'opacity-50',
                )}
              >
                <div
                  className={cn(
                    'mb-0.5 text-right text-[11px] tabular-nums',
                    isToday ? 'font-semibold text-accent' : 'text-ink-muted',
                  )}
                >
                  {cell.day}
                </div>

                <div className="space-y-0.5">
                  {dayItems.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenItem(item)}
                      title={item.title}
                      className={cn(
                        'block w-full truncate rounded border px-1 py-0.5 text-left text-[10px] leading-tight transition-colors duration-150',
                        item.status === 'completed'
                          ? 'border-line bg-surface-2 text-ink-muted line-through'
                          : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
                      )}
                    >
                      {item.title}
                    </button>
                  ))}
                  {dayItems.length > 2 ? (
                    <p className="px-1 text-[10px] text-ink-muted">+{dayItems.length - 2} more</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}
