import { CircleAlert, GraduationCap, Plus, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AcademicItemRow } from '../components/planner/AcademicItemRow'
import { ItemFormDialog } from '../components/planner/ItemFormDialog'
import { PlannerCalendar } from '../components/planner/PlannerCalendar'
import { SubjectManagerDialog } from '../components/planner/SubjectManagerDialog'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { PageHeader } from '../components/ui/PageHeader'
import { usePlanner } from '../hooks/usePlanner'
import {
  academicStats,
  filterAndSortAcademic,
  type AcademicListOptions,
  type PlannerView,
} from '../lib/academic'
import { cn } from '../lib/cn'
import type { AcademicItem, AcademicItemKind } from '../types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

type Tab = PlannerView | 'calendar'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
]

const KIND_OPTIONS: Array<{ value: AcademicItemKind | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'assignment', label: 'Assignments' },
  { value: 'exam', label: 'Exams' },
  { value: 'milestone', label: 'Milestones' },
]

const SELECT =
  'rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function StatBlock({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="min-w-[7rem] flex-1">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cn('mt-0.5 text-lg font-semibold tabular-nums', tone === 'danger' ? 'text-danger' : 'text-ink')}>
        {value}
      </p>
    </div>
  )
}

/**
 * Academic planner (stage 4): subjects plus assignments, exams, and
 * milestones with priorities, statuses, and progress — in upcoming/all/
 * completed list views or a month calendar, with search and filters over
 * live Firestore data.
 */
export default function PlannerPage() {
  const {
    subjects,
    items,
    loading,
    error,
    readOnly,
    source,
    reload,
    createSubject,
    updateSubject,
    removeSubject,
    createItem,
    updateItem,
    removeItem,
  } = usePlanner()
  const now = useMemo(() => new Date(), [])

  const [tab, setTab] = useState<Tab>('upcoming')
  const [kind, setKind] = useState<AcademicItemKind | 'all'>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicItem | null>(null)
  const [subjectsOpen, setSubjectsOpen] = useState(false)
  const [deleting, setDeleting] = useState<AcademicItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)

  const stats = useMemo(() => academicStats(items, now), [items, now])

  const listView: PlannerView = tab === 'calendar' ? 'all' : tab
  const listOptions: AcademicListOptions = {
    view: listView,
    kind,
    subjectId: subjectFilter,
    search,
  }
  const visible = useMemo(
    () => filterAndSortAcademic(items, listOptions),
    [items, listView, kind, subjectFilter, search],
  )
  // Calendar placement uses the same filters, but only for dated items.
  const calendarItems = useMemo(
    () => filterAndSortAcademic(items, { ...listOptions, view: 'all' }).filter((item) => item.dueDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, kind, subjectFilter, search],
  )

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [subjects],
  )

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await removeItem(deleting.id)
      setDeleting(null)
    } catch (deleteFailure) {
      setDeleteError(errorMessage(deleteFailure))
    } finally {
      setDeleteBusy(false)
    }
  }

  function emptyContent(): { title: string; description: string } {
    if (search.trim()) {
      return {
        title: 'No matching items',
        description: `Nothing matches “${search.trim()}”. Try different words or clear the search.`,
      }
    }
    if (kind !== 'all' || subjectFilter !== 'all') {
      return {
        title: 'Nothing matches these filters',
        description: 'Try a different type or subject, or switch to the All view.',
      }
    }
    switch (tab) {
      case 'completed':
        return { title: 'No completed items yet', description: 'Finished work will collect here.' }
      case 'calendar':
        return { title: 'Nothing scheduled', description: 'Items with due dates will appear on the calendar.' }
      case 'all':
        return { title: 'No planner items yet', description: 'Add your first assignment, exam, or milestone.' }
      default:
        return { title: 'Nothing upcoming', description: 'No open deadlines — add an item to get started.' }
    }
  }

  const empty = emptyContent()

  return (
    <div>
      <PageHeader
        title="Academic Planner"
        description="Subjects, assignments, exams, and milestones in one timeline."
        actions={
          <>
            <Button variant="secondary" onClick={() => setSubjectsOpen(true)} disabled={readOnly}>
              <Users className="h-4 w-4" aria-hidden="true" />
              Manage subjects
            </Button>
            <Button variant="primary" onClick={openCreate} disabled={readOnly}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New item
            </Button>
          </>
        }
      />

      {source === 'sample' ? (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Sample-data mode — the planner is read-only here. Configure Firebase in{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env</code> to create your
          own.
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
        <LoadingState label="Loading your planner…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex flex-wrap gap-x-6 gap-y-3 px-5 py-4">
              <StatBlock label="Open" value={String(stats.open)} />
              <StatBlock label="Overdue" value={String(stats.overdue)} tone={stats.overdue > 0 ? 'danger' : undefined} />
              <StatBlock label="Completed" value={String(stats.completed)} />
              <StatBlock label="Avg. progress" value={`${stats.averageProgress}%`} />
              <StatBlock label="Assignments" value={String(stats.byKind.assignment)} />
              <StatBlock label="Exams" value={String(stats.byKind.exam)} />
            </div>
          </Card>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-md border border-line bg-surface p-1">
              {TABS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTab(option.value)}
                  aria-current={tab === option.value ? 'page' : undefined}
                  className={cn(
                    'rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                    tab === option.value
                      ? 'bg-surface-2 text-ink'
                      : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as AcademicItemKind | 'all')}
              aria-label="Filter by type"
              className={SELECT}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              aria-label="Filter by subject"
              className={SELECT}
            >
              <option value="all">All subjects</option>
              <option value="">No subject</option>
              {sortedSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} — ${subject.name}` : subject.name}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search items…"
              aria-label="Search planner items"
              className="min-w-[10rem] flex-1 rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>

          {tab === 'calendar' ? (
            <PlannerCalendar
              cursor={cursor}
              onCursorChange={setCursor}
              items={calendarItems}
              now={now}
              onOpenItem={(item) => {
                setEditing(item)
                setFormOpen(true)
              }}
            />
          ) : visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={GraduationCap}
                title={empty.title}
                description={empty.description}
                action={
                  !readOnly && tab !== 'completed' && !search.trim() && kind === 'all' ? (
                    <Button variant="primary" onClick={openCreate}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New item
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {visible.map((item) => (
                  <AcademicItemRow
                    key={item.id}
                    item={item}
                    subjects={subjects}
                    now={now}
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
            </Card>
          )}

          <p className="mt-3 text-xs text-ink-muted">
            Showing {tab === 'calendar' ? calendarItems.length : visible.length} of {items.length}{' '}
            {items.length === 1 ? 'item' : 'items'} · {subjects.length}{' '}
            {subjects.length === 1 ? 'subject' : 'subjects'}
          </p>
        </>
      )}

      <ItemFormDialog
        open={formOpen}
        item={editing}
        subjects={subjects}
        onClose={() => setFormOpen(false)}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateItem(editing.id, values)
            } else {
              await createItem(values)
            }
            setWriteError(null)
          } catch (submitFailure) {
            setWriteError(errorMessage(submitFailure))
            throw submitFailure
          }
        }}
      />

      <SubjectManagerDialog
        open={subjectsOpen}
        subjects={subjects}
        onClose={() => setSubjectsOpen(false)}
        onSubmit={async (values, editingId) => {
          if (editingId) {
            await updateSubject(editingId, values)
          } else {
            await createSubject(values)
          }
        }}
        onDelete={async (subject) => {
          await removeSubject(subject.id)
        }}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete item?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete item'}
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
