import { CircleAlert, Plus, Repeat, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { HabitFormDialog } from '../components/habits/HabitFormDialog'
import { HabitRow } from '../components/habits/HabitRow'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useHabits } from '../hooks/useHabits'
import { habitOverview, type HabitOverviewRow } from '../lib/habit'
import { weeklyHabitRate } from '../lib/derive'
import { todayISO } from '../lib/dates'
import type { Habit } from '../types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

/**
 * Habit tracker (stage 4): daily and weekly habits with per-date completions
 * (duplicate-proof), streaks, a 14-day history strip, and weekly/monthly
 * statistics — all live from Firestore.
 */
export default function HabitsPage() {
  const {
    habits,
    completions,
    loading,
    error,
    readOnly,
    source,
    reload,
    createHabit,
    updateHabit,
    setHabitArchived,
    removeHabit,
    toggleCompletion,
  } = useHabits()
  const now = useMemo(() => new Date(), [])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [deleting, setDeleting] = useState<HabitOverviewRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const activeHabits = useMemo(() => habits.filter((habit) => !habit.archived), [habits])
  const archivedHabits = useMemo(() => habits.filter((habit) => habit.archived), [habits])

  const activeRows = useMemo(
    () => habitOverview(activeHabits, completions, now),
    [activeHabits, completions, now],
  )
  const archivedRows = useMemo(
    () => habitOverview(archivedHabits, completions, now),
    [archivedHabits, completions, now],
  )

  const completedToday = activeRows.filter((row) => row.completedToday).length
  const weekRate = weeklyHabitRate(habits, completions, now)

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  async function handleToggle(row: HabitOverviewRow): Promise<void> {
    setWriteError(null)
    setBusyId(row.habit.id)
    try {
      await toggleCompletion(row.habit, todayISO(now))
    } catch (toggleError) {
      setWriteError(errorMessage(toggleError))
    } finally {
      setBusyId(null)
    }
  }

  async function handleArchive(row: HabitOverviewRow, archived: boolean): Promise<void> {
    setWriteError(null)
    setBusyId(row.habit.id)
    try {
      await setHabitArchived(row.habit.id, archived)
    } catch (archiveError) {
      setWriteError(errorMessage(archiveError))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await removeHabit(deleting.habit.id)
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
        title="Habits"
        description="Daily and weekly routines, with streaks and completion history."
        actions={
          <Button variant="primary" onClick={openCreate} disabled={readOnly}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New habit
          </Button>
        }
      />

      {source === 'sample' ? (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Sample-data mode — habits are read-only here. Configure Firebase in{' '}
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
        <LoadingState label="Loading habits…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <Card className="mb-4">
            <div className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {completedToday} of {activeRows.length} done today
                </p>
                <p className="text-xs text-ink-muted tabular-nums">{weekRate}% completed this week</p>
              </div>
              <ProgressBar
                value={completedToday}
                max={Math.max(1, activeRows.length)}
                label="Today's habit completion"
                className="mt-2"
              />
            </div>
          </Card>

          {activeRows.length === 0 ? (
            <Card>
              <EmptyState
                icon={Repeat}
                title="No habits yet"
                description="Create your first habit — check it off any day to start a streak."
                action={
                  readOnly ? undefined : (
                    <Button variant="primary" onClick={openCreate}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New habit
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {activeRows.map((row) => (
                  <HabitRow
                    key={row.habit.id}
                    row={row}
                    busy={busyId === row.habit.id}
                    onToggle={(selected) => void handleToggle(selected)}
                    onEdit={(selected) => {
                      setEditing(selected.habit)
                      setFormOpen(true)
                    }}
                    onSetArchived={(selected, archived) => void handleArchive(selected, archived)}
                    onDelete={(selected) => {
                      setDeleteError(null)
                      setDeleting(selected)
                    }}
                  />
                ))}
              </ul>
            </Card>
          )}

          {archivedHabits.length > 0 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowArchived((value) => !value)}
                aria-expanded={showArchived}
                className="mb-2 text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
              >
                {showArchived ? 'Hide' : 'Show'} archived ({archivedHabits.length})
              </button>
              {showArchived ? (
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-line">
                    {archivedRows.map((row) => (
                      <HabitRow
                        key={row.habit.id}
                        row={row}
                        archived
                        onToggle={() => undefined}
                        onEdit={(selected) => {
                          setEditing(selected.habit)
                          setFormOpen(true)
                        }}
                        onSetArchived={(selected, archived) => void handleArchive(selected, archived)}
                        onDelete={(selected) => {
                          setDeleteError(null)
                          setDeleting(selected)
                        }}
                      />
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <HabitFormDialog
        open={formOpen}
        habit={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateHabit(editing.id, values)
            } else {
              await createHabit(values)
            }
            setWriteError(null)
          } catch (submitFailure) {
            setWriteError(errorMessage(submitFailure))
            throw submitFailure
          }
        }}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete habit?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete habit'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {deleting ? (
            <>
              <span className="font-medium text-ink">“{deleting.habit.name}”</span> and its entire
              completion history will be permanently removed. This can’t be undone.
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
