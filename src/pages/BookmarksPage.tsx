import { Bookmark as BookmarkIcon, CircleAlert, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BookmarkFormDialog } from '../components/bookmarks/BookmarkFormDialog'
import { BookmarkRow } from '../components/bookmarks/BookmarkRow'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { PageHeader } from '../components/ui/PageHeader'
import { useBookmarks } from '../hooks/useBookmarks'
import {
  bookmarkCategories,
  filterAndSortBookmarks,
  type BookmarkFormValues,
  type BookmarkSort,
} from '../lib/bookmarks'
import type { Bookmark } from '../types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

const SELECT =
  'h-9 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const SORTS: Array<{ value: BookmarkSort; label: string }> = [
  { value: 'recent', label: 'Recently added' },
  { value: 'title', label: 'Title (A–Z)' },
]

/**
 * Bookmarks (stage 5): save a title, URL, category, and description; validate
 * URLs; search and filter; and open links safely in a new tab.
 */
export default function BookmarksPage() {
  const {
    bookmarks,
    loading,
    error,
    readOnly,
    source,
    reload,
    createBookmark,
    updateBookmark,
    removeBookmark,
  } = useBookmarks()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<BookmarkSort>('recent')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bookmark | null>(null)
  const [deleting, setDeleting] = useState<Bookmark | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)

  const categories = useMemo(() => bookmarkCategories(bookmarks), [bookmarks])
  const visible = useMemo(
    () => filterAndSortBookmarks(bookmarks, { search, category, sort }),
    [bookmarks, search, category, sort],
  )
  const filtering = search.trim() !== '' || category !== 'all'

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  async function handleSubmit(values: BookmarkFormValues): Promise<void> {
    try {
      if (editing) await updateBookmark(editing.id, values)
      else await createBookmark(values)
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
      await removeBookmark(deleting.id)
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
        title="Bookmarks"
        description="Save and find the links you use often."
        actions={
          <Button variant="primary" onClick={openCreate} disabled={readOnly}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New bookmark
          </Button>
        }
      />

      {source === 'sample' ? (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Sample-data mode — bookmarks are read-only here. Configure Firebase in{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env</code> to save your own.
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
        <LoadingState label="Loading bookmarks…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <div className="relative">
              <label htmlFor="bookmark-search" className="sr-only">
                Search bookmarks
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                id="bookmark-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles, URLs, or descriptions…"
                className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-muted tabular-nums">
                {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  Sort
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as BookmarkSort)}
                    className={SELECT}
                  >
                    {SORTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={SELECT}
                  >
                    <option value="all">All</option>
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden">
            {visible.length === 0 ? (
              <EmptyState
                icon={BookmarkIcon}
                title={bookmarks.length > 0 ? 'No matching bookmarks' : 'No bookmarks yet'}
                description={
                  bookmarks.length > 0
                    ? 'Nothing matches the current search and category. Clear them to see everything.'
                    : 'Save a link with a title, URL, and category and it will show up here — and in the dashboard’s quick links.'
                }
                action={
                  bookmarks.length > 0 ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch('')
                        setCategory('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : readOnly ? undefined : (
                    <Button variant="primary" onClick={openCreate}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New bookmark
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <CardHeader
                  title="Saved links"
                  subtitle={`${visible.length} shown · links open in a new tab`}
                />
                <ul className="divide-y divide-line border-t border-line">
                  {visible.map((bookmark) => (
                    <BookmarkRow
                      key={bookmark.id}
                      bookmark={bookmark}
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
              </>
            )}
          </Card>

          {filtering && visible.length > 0 ? (
            <p className="mt-3 text-xs text-ink-muted">
              Showing {visible.length} of {bookmarks.length} bookmarks.
            </p>
          ) : null}
        </>
      )}

      <BookmarkFormDialog
        open={formOpen}
        bookmark={editing}
        categories={categories}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete bookmark?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete bookmark'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {deleting ? (
            <>
              <span className="font-medium text-ink">“{deleting.title}”</span> will be removed from
              your bookmarks. This can’t be undone.
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
