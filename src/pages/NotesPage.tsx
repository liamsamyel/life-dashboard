import { CircleAlert, Plus, Search, StickyNote, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NoteCard } from '../components/notes/NoteCard'
import { NoteFormDialog } from '../components/notes/NoteFormDialog'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { PageHeader } from '../components/ui/PageHeader'
import { useNotes } from '../hooks/useNotes'
import { allTags, filterAndSortNotes, type NoteFormValues } from '../lib/notes'
import type { Note } from '../types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

/**
 * Notes (stage 5): create, edit, pin, search, and delete notes with tags and
 * timestamps. Pinned notes come first, then the most recently edited — the
 * same order the dashboard's "Recent notes" widget uses.
 */
export default function NotesPage() {
  const { notes, loading, error, readOnly, source, reload, createNote, updateNote, setNotePinned, removeNote } =
    useNotes()
  const [searchParams, setSearchParams] = useSearchParams()
  const now = useMemo(() => new Date(), [])

  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Dashboard quick action: /notes?new=1 opens the create form once.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    setSearchParams({}, { replace: true })
    if (readOnly) return
    setEditing(null)
    setFormOpen(true)
  }, [searchParams, readOnly, setSearchParams])

  const tags = useMemo(() => allTags(notes), [notes])
  const visible = useMemo(() => filterAndSortNotes(notes, { search, tag }), [notes, search, tag])
  const pinnedCount = notes.filter((note) => note.pinned).length
  const filtering = search.trim() !== '' || tag !== 'all'

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  async function handlePin(note: Note): Promise<void> {
    setWriteError(null)
    setBusyId(note.id)
    try {
      await setNotePinned(note.id, !note.pinned)
    } catch (pinError) {
      setWriteError(errorMessage(pinError))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSubmit(values: NoteFormValues): Promise<void> {
    try {
      if (editing) await updateNote(editing.id, values)
      else await createNote(values)
      setWriteError(null)
    } catch (submitFailure) {
      setWriteError(errorMessage(submitFailure))
      throw submitFailure
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await removeNote(deleting.id)
      setDeleting(null)
    } catch (deleteFailure) {
      setDeleteError(errorMessage(deleteFailure))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Capture ideas with titles, tags, and timestamps."
        actions={
          <Button variant="primary" onClick={openCreate} disabled={readOnly}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New note
          </Button>
        }
      />

      {source === 'sample' ? (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Sample-data mode — notes are read-only here. Configure Firebase in{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env</code> to write your own.
        </div>
      ) : null}

      {writeError ? (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <span className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {writeError}
          </span>
          <button
            type="button"
            onClick={() => setWriteError(null)}
            aria-label="Dismiss error"
            className="shrink-0 rounded p-0.5 hover:bg-danger/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Loading notes…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <div className="relative">
              <label htmlFor="note-search" className="sr-only">
                Search notes
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="note-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles, content, or tags…"
                className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={tag === 'all'}
                  onClick={() => setTag('all')}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    tag === 'all'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line text-ink-muted hover:text-ink'
                  }`}
                >
                  All notes
                </button>
                {tags.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={tag === option}
                    onClick={() => setTag(option)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                      tag === option
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line text-ink-muted hover:text-ink'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-muted tabular-nums">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'} · {pinnedCount} pinned
              </p>
            </div>
          </div>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={StickyNote}
                title={notes.length > 0 ? 'No matching notes' : 'No notes yet'}
                description={
                  notes.length > 0
                    ? 'Nothing matches this search and tag. Clear the filters to see your notes again.'
                    : 'Write your first note — give it a title, add tags, and pin it if you need it at the top.'
                }
                action={
                  notes.length > 0 ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch('')
                        setTag('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : readOnly ? undefined : (
                    <Button variant="primary" onClick={openCreate}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New note
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  now={now}
                  busy={busyId === note.id}
                  onTogglePin={(selected) => void handlePin(selected)}
                  onEdit={(selected) => {
                    setEditing(selected)
                    setFormOpen(true)
                  }}
                  onDelete={(selected) => {
                    setDeleteError(null)
                    setDeleting(selected)
                  }}
                />
              ))}
            </ul>
          )}

          {filtering && visible.length > 0 ? (
            <p className="mt-3 text-xs text-ink-muted">
              Showing {visible.length} of {notes.length} notes.
            </p>
          ) : null}
        </>
      )}

      <NoteFormDialog
        open={formOpen}
        note={editing}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete note?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete note'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {deleting ? (
            <>
              <span className="font-medium text-ink">“{deleting.title}”</span> will be permanently
              removed. This can’t be undone.
            </>
          ) : null}
        </p>
        {deleteError ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {deleteError}
          </p>
        ) : null}
      </Dialog>
    </div>
  )
}
