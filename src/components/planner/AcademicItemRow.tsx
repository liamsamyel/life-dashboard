import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { subjectLabel } from '../../lib/academic'
import type { AcademicItem, Subject } from '../../types'
import { Badge, priorityTone, type BadgeTone } from '../ui/Badge'
import { DueDate } from '../ui/DueDate'
import { ProgressBar } from '../ui/ProgressBar'

interface AcademicItemRowProps {
  item: AcademicItem
  subjects: Subject[]
  now: Date
  onEdit: (item: AcademicItem) => void
  onDelete: (item: AcademicItem) => void
}

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

function statusLabel(item: AcademicItem): string {
  if (item.status === 'completed') return 'Completed'
  if (item.status === 'in_progress') return 'In progress'
  return 'Not started'
}

function statusTone(item: AcademicItem): BadgeTone {
  if (item.status === 'completed') return 'success'
  if (item.status === 'in_progress') return 'accent'
  return 'neutral'
}

/**
 * One planner item: kind and status badges (spelled out, never color alone),
 * subject and due date, a progress bar while work is underway, and
 * edit/delete actions with explicit accessible names.
 */
export function AcademicItemRow({ item, subjects, now, onEdit, onDelete }: AcademicItemRowProps) {
  const completed = item.status === 'completed'
  const showProgress = item.status === 'in_progress' || item.progress > 0
  const subject = subjectLabel(subjects, item.subjectId)

  return (
    <li className="px-5 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {item.kind === 'assignment' ? 'Assignment' : item.kind === 'exam' ? 'Exam' : 'Milestone'}
            </span>
            <Badge tone={statusTone(item)}>{statusLabel(item)}</Badge>
            <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
          </div>

          <p className={cn('mt-1 text-sm leading-snug', completed ? 'text-ink-muted' : 'text-ink')}>
            {item.title}
          </p>
          {item.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{item.description}</p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <DueDate due={item.dueDate} now={now} />
            {subject ? <span className="text-[11px] text-ink-muted">{subject}</span> : null}
          </div>

          {showProgress ? (
            <ProgressBar
              value={item.progress}
              label={`Progress on “${item.title}”`}
              className="mt-2 max-w-sm"
            />
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className={ICON_BUTTON}
            title="Edit item"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Edit “{item.title}”</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className={cn(ICON_BUTTON, 'hover:bg-danger/10 hover:text-danger')}
            title="Delete item"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Delete “{item.title}”</span>
          </button>
        </div>
      </div>
    </li>
  )
}
