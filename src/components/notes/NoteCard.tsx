import { Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { noteExcerpt } from '../../lib/notes'
import { formatRelativeTimestamp } from '../../lib/format'
import type { Note } from '../../types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

interface NoteCardProps {
  note: Note
  now: Date
  /** Disables the pin toggle while its write is in flight. */
  busy?: boolean
  onTogglePin: (note: Note) => void
  onEdit: (note: Note) => void
  onDelete: (note: Note) => void
}

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink disabled:cursor-wait disabled:opacity-60'

/**
 * One note: title, excerpt, tags, and update time, with a labelled pin
 * toggle (its state is exposed via aria-pressed and the icon, not color).
 */
export function NoteCard({ note, now, busy, onTogglePin, onEdit, onDelete }: NoteCardProps) {
  return (
    <li>
      <Card className="flex h-full flex-col p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">
            {note.title}
          </h3>
          <button
            type="button"
            onClick={() => onTogglePin(note)}
            disabled={busy}
            aria-pressed={note.pinned}
            title={note.pinned ? 'Unpin note' : 'Pin note'}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150 hover:bg-surface-2',
              note.pinned ? 'text-accent' : 'text-ink-muted hover:text-ink',
            )}
          >
            {note.pinned ? (
              <Pin className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PinOff className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {note.pinned ? 'Unpin' : 'Pin'} “{note.title}”
            </span>
          </button>
        </div>

        <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-ink-muted">
          {noteExcerpt(note.content, 220)}
        </p>

        {note.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
          <span className="text-[11px] text-ink-muted">
            Updated {formatRelativeTimestamp(note.updatedAt, now).toLowerCase()}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onEdit(note)}
              className={ICON_BUTTON}
              title="Edit note"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Edit “{note.title}”</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(note)}
              className={cn(ICON_BUTTON, 'hover:bg-danger/10 hover:text-danger')}
              title="Delete note"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Delete “{note.title}”</span>
            </button>
          </div>
        </div>
      </Card>
    </li>
  )
}
