import { ListChecks, CircleAlert, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TaskFormDialog } from '../components/tasks/TaskFormDialog'
import { TaskListToolbar } from '../components/tasks/TaskListToolbar'
import { TaskRow } from '../components/tasks/TaskRow'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { PageHeader } from '../components/ui/PageHeader'
import { useTasks } from '../hooks/useTasks'
import { filterAndSortTasks, groupTasks, type TaskSort, type TaskView } from '../lib/derive'
import type { Task } from '../types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

/**
 * Task manager (stage 3): full CRUD persisted to Firestore with live
 * updates, grouped views (all/today/upcoming/overdue/completed), text
 * search, category filter, sorting, and loading/error/empty states.
 */
export default function TasksPage() {
  const { tasks, loading, error, readOnly, source, reload, createTask, updateTask, setTaskCompleted, removeTask } =
    useTasks()
  const [searchParams, setSearchParams] = useSearchParams()
  const now = useMemo(() => new Date(), [])

  const [view, setView] = useState<TaskView>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<TaskSort>('dueDate')
  const [category, setCategory] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Dashboard quick action: /tasks?new=1 opens the create form once.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    setSearchParams({}, { replace: true })
    if (readOnly) return
    setEditing(null)
    setFormOpen(true)
  }, [searchParams, readOnly, setSearchParams])

  const groups = useMemo(() => groupTasks(tasks, now), [tasks, now])
  const counts = useMemo(
    () => ({
      all: tasks.length,
      today: groups.today.length,
      upcoming: groups.upcoming.length,
      overdue: groups.overdue.length,
      completed: groups.completed.length,
    }),
    [tasks, groups],
  )
  const categories = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.category))).sort((a, b) => a.localeCompare(b)),
    [tasks],
  )
  const visible = useMemo(
    () => filterAndSortTasks(tasks, { view, search, category, sort, now }),
    [tasks, view, search, category, sort, now],
  )

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  async function handleToggle(task: Task): Promise<void> {
    setWriteError(null)
    setBusyId(task.id)
    try {
      await setTaskCompleted(task.id, task.status !== 'completed')
    } catch (toggleError) {
      setWriteError(errorMessage(toggleError))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await removeTask(deleting.id)
      setDeleting(null)
    } catch (deleteFailure) {
      setDeleteError(errorMessage(deleteFailure))
    } finally {
      setDeleteBusy(false)
    }
  }

  function emptyStateContent(): { title: string; description: string } {
    if (search.trim()) {
      return {
        title: 'No matching tasks',
        description: `Nothing matches “${search.trim()}”. Try different words or clear the search.`,
      }
    }
    if (category !== 'all') {
      return {
        title: 'Nothing in this category',
        description: `No tasks match this view under “${category}”.`,
      }
    }
    switch (view) {
      case 'overdue':
        return { title: 'No overdue tasks', description: 'You’re on track — nothing is past due.' }
      case 'today':
        return { title: 'Nothing due today', description: 'No tasks are due today.' }
      case 'upcoming':
        return { title: 'Nothing coming up', description: 'No future tasks yet.' }
      case 'completed':
        return { title: 'No completed tasks yet', description: 'Finished tasks will collect here.' }
      case 'all':
        return { title: 'No tasks yet', description: 'Create your first task to get started.' }
    }
  }

  const empty = emptyStateContent()

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Everything you need to do, organized by when it’s due."
        actions={
          <Button variant="primary" onClick={openCreate} disabled={readOnly}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New task
          </Button>
        }
      />

      {source === 'sample' ? (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Sample-data mode — tasks are read-only here. Configure Firebase in{' '}
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
        <LoadingState label="Loading tasks…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <TaskListToolbar
            view={view}
            onViewChange={setView}
            counts={counts}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
          />

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={ListChecks}
                title={empty.title}
                description={empty.description}
                action={
                  !readOnly && view === 'all' && !search.trim() ? (
                    <Button variant="primary" onClick={openCreate}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New task
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {visible.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    now={now}
                    busy={busyId === task.id}
                    onToggle={(selected) => void handleToggle(selected)}
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
            Showing {visible.length} of {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </>
      )}

      <TaskFormDialog
        open={formOpen}
        task={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSubmit={async (values) => {
          if (editing) {
            await updateTask(editing.id, values)
          } else {
            await createTask(values)
          }
          setWriteError(null)
        }}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete task?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete task'}
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
