import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Task } from '../../types'
import { Badge, priorityTone } from '../ui/Badge'
import { DueDate } from '../ui/DueDate'

interface TaskRowProps {
  task: Task
  now: Date
  /** Disables the checkbox while this task's toggle is in flight. */
  busy?: boolean
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

/**
 * One task: real checkbox (status is also carried by strikethrough and the
 * DueDate label, never color alone), metadata row, and edit/delete actions
 * with explicit accessible names.
 */
export function TaskRow({ task, now, busy, onToggle, onEdit, onDelete }: TaskRowProps) {
  const completed = task.status === 'completed'

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <input
        type="checkbox"
        checked={completed}
        disabled={busy}
        onChange={() => onToggle(task)}
        aria-label={`Mark “${task.title}” as ${completed ? 'not completed' : 'completed'}`}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent disabled:cursor-wait"
      />

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug', completed ? 'text-ink-muted line-through' : 'text-ink')}>
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{task.description}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <DueDate due={task.dueDate} now={now} className={completed ? 'opacity-70' : undefined} />
          <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
          <span className="text-[11px] text-ink-muted">{task.category}</span>
          {completed ? <span className="text-[11px] text-success">Completed</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => onEdit(task)} className={ICON_BUTTON} title="Edit task">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Edit “{task.title}”</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className={ICON_BUTTON}
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Delete “{task.title}”</span>
        </button>
      </div>
    </li>
  )
}
