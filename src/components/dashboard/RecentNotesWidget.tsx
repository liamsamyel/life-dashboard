import { Pin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Note } from '../../types'
import { formatRelativeTimestamp } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'

interface RecentNotesWidgetProps {
  /** Already sorted (pinned first, then most recently updated). */
  notes: Note[]
  now: Date
  className?: string
}

/** The four most relevant notes with pin state, excerpt, tags, and update time. */
export default function RecentNotesWidget({ notes, now, className }: RecentNotesWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader
        title="Recent notes"
        action={
          <Link to="/notes" className="font-medium text-accent hover:underline">
            View all
          </Link>
        }
      />
      <CardBody>
        {notes.length === 0 ? (
          <p className="text-sm text-ink-muted">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {notes.map((note) => (
              <li key={note.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  {note.pinned ? (
                    <>
                      <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                      <span className="sr-only">Pinned.</span>
                    </>
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{note.title}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{note.content}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] text-ink-muted">
                    Updated {formatRelativeTimestamp(note.updatedAt, now).toLowerCase()}
                  </span>
                  {note.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                  {note.tags.length > 2 ? (
                    <span className="text-[11px] text-ink-muted">+{note.tags.length - 2}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
