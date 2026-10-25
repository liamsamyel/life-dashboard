import { Circle, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Task } from '../../types'
import { Badge, priorityTone } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DueDate } from '../ui/DueDate'
import { ProgressBar } from '../ui/ProgressBar'

interface TodayTasksWidgetProps {
  /** Pending tasks that are overdue or due today. */
  tasks: Task[]
  /** Completion across everything due on or before today. */
  progress: { total: number; completed: number }
  now: Date
  className?: string
}

/** Today's tasks plus completion progress. Rows are display-only until task CRUD lands in stage 3. */
export default function TodayTasksWidget({ tasks, progress, now, className }: TodayTasksWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader
        title="Today's tasks"
        subtitle={
          progress.total > 0
            ? `${progress.completed} of ${progress.total} due today or earlier`
            : 'Nothing due today'
        }
        action={
          <Link to="/tasks" className="font-medium text-accent hover:underline">
            View all
          </Link>
        }
      />
      <CardBody>
        {progress.total > 0 ? (
          <ProgressBar
            value={progress.completed}
            max={progress.total}
            label="Tasks due today or earlier"
            className="mb-4"
          />
        ) : null}

        {tasks.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <CircleCheck className="h-4 w-4 text-success" aria-hidden="true" />
            Nothing left due — you're clear.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <DueDate due={task.dueDate} now={now} />
                    <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                    <span className="text-xs text-ink-muted">{task.category}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
