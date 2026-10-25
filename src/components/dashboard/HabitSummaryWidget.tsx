import { Circle, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HabitSummary } from '../../lib/derive'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'

interface HabitSummaryWidgetProps {
  summary: HabitSummary
  /** Completion rate for daily habits in the week so far (0–100). */
  weekRate: number
  className?: string
}

/** Today's habit checklist with a weekly completion summary. */
export default function HabitSummaryWidget({ summary, weekRate, className }: HabitSummaryWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader
        title="Habits"
        subtitle={`${summary.completedToday} of ${summary.total} done today`}
        action={
          <Link to="/habits" className="font-medium text-accent hover:underline">
            View all
          </Link>
        }
      />
      <CardBody className="flex-1">
        <div className="mb-3">
          <Badge tone="accent">{weekRate}% completed this week</Badge>
        </div>

        {summary.items.length === 0 ? (
          <p className="text-sm text-ink-muted">No habits yet — add your first one in the tracker.</p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.items.map(({ habit, completedToday }) => (
              <li key={habit.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {completedToday ? (
                  <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{habit.name}</span>
                <span className="text-[11px] text-ink-muted">{habit.frequency}</span>
                <Badge tone={completedToday ? 'success' : 'neutral'}>
                  {completedToday ? 'Done' : 'To do'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
