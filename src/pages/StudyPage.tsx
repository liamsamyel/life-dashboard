import { CircleAlert, Pause, Play, Square, Timer, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import StudyHoursWidget from '../components/dashboard/StudyHoursWidget'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { useCollection } from '../hooks/useCollection'
import { useStudy } from '../hooks/useStudy'
import { subjectLabel } from '../lib/academic'
import { weeklyStudy, totalMinutes } from '../lib/derive'
import { todayISO } from '../lib/dates'
import { formatDuration, formatRelativeTimestamp } from '../lib/format'
import { elapsedSeconds, formatClock, minutesForDate } from '../lib/study'
import type { StudySession, Subject } from '../types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

const SELECT =
  'rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

function statusBadge(status: StudySession['status']): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'running':
      return { label: 'Running', tone: 'accent' }
    case 'paused':
      return { label: 'Paused', tone: 'neutral' }
    case 'cancelled':
      return { label: 'Discarded', tone: 'neutral' }
    default:
      return { label: 'Completed', tone: 'success' }
  }
}

/**
 * Study tracker (stage 4): start/pause/resume/stop sessions linked to a
 * subject, with optional notes on stop, daily and weekly totals, a weekly
 * chart, and recovery of interrupted sessions — elapsed time is derived
 * from stored timestamps, so a reload never loses it.
 */
export default function StudyPage() {
  const {
    sessions,
    active,
    loading,
    error,
    readOnly,
    source,
    reload,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    discardActiveSession,
    removeSession,
  } = useStudy()
  const subjectsCollection = useCollection<Subject>('subjects')
  const subjects = subjectsCollection.rows

  const [now, setNow] = useState(() => new Date())
  const [selectedSubject, setSelectedSubject] = useState('')
  const [writeError, setWriteError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)
  const [stopNote, setStopNote] = useState('')
  const [stopBusy, setStopBusy] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<StudySession | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const running = active?.status === 'running'

  // Tick once a second while a session runs, so the clock stays live.
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const todayMinutes = useMemo(
    () => minutesForDate(sessions, todayISO(now), now),
    [sessions, now],
  )
  const weekDays = useMemo(() => weeklyStudy(sessions, now), [sessions, now])
  const weekMinutes = useMemo(() => totalMinutes(weekDays), [weekDays])

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 25),
    [sessions],
  )

  const startedHours = active
    ? (now.getTime() - new Date(active.startedAt).getTime()) / 3_600_000
    : 0

  async function runAction(action: () => Promise<void>): Promise<void> {
    setActionBusy(true)
    setWriteError(null)
    try {
      await action()
    } catch (actionError) {
      setWriteError(errorMessage(actionError))
    } finally {
      setActionBusy(false)
    }
  }

  async function handleStop(): Promise<void> {
    setStopBusy(true)
    setStopError(null)
    try {
      await stopSession(stopNote)
      setStopOpen(false)
      setStopNote('')
    } catch (stopFailure) {
      setStopError(errorMessage(stopFailure))
    } finally {
      setStopBusy(false)
    }
  }

  async function handleDiscardFromDialog(): Promise<void> {
    setStopBusy(true)
    setStopError(null)
    try {
      await discardActiveSession()
      setStopOpen(false)
      setStopNote('')
    } catch (discardFailure) {
      setStopError(errorMessage(discardFailure))
    } finally {
      setStopBusy(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await removeSession(deleting.id)
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
        title="Study Tracker"
        description="Timed sessions with daily and weekly totals."
      />

      {source === 'sample' ? (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Sample-data mode — sessions are read-only here. Configure Firebase in{' '}
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
        <LoadingState label="Loading sessions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader
              title={active ? (running ? 'Session running' : 'Session paused') : 'Ready to study'}
              subtitle={
                active
                  ? `Started ${formatRelativeTimestamp(active.startedAt, now)} at ${new Date(active.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                  : 'Pick a subject and start the timer.'
              }
            />
            <CardBody>
              <div className="flex flex-wrap items-center gap-4">
                <p
                  className="text-4xl font-semibold tabular-nums tracking-tight text-ink"
                  aria-live={running ? 'off' : 'polite'}
                  aria-label={active ? `Elapsed time ${formatClock(elapsedSeconds(active, now))}` : 'No session running'}
                >
                  {active ? formatClock(elapsedSeconds(active, now)) : '0:00'}
                </p>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {active ? (
                    <>
                      {running ? (
                        <Button
                          variant="secondary"
                          onClick={() => void runAction(() => pauseSession())}
                          disabled={actionBusy}
                        >
                          <Pause className="h-4 w-4" aria-hidden="true" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => void runAction(() => resumeSession())}
                          disabled={actionBusy}
                        >
                          <Play className="h-4 w-4" aria-hidden="true" />
                          Resume
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        onClick={() => {
                          setStopNote('')
                          setStopError(null)
                          setStopOpen(true)
                        }}
                        disabled={actionBusy || readOnly}
                      >
                        <Square className="h-4 w-4" aria-hidden="true" />
                        Stop
                      </Button>
                    </>
                  ) : (
                    <>
                      <label htmlFor="session-subject" className="sr-only">
                        Subject for this session
                      </label>
                      <select
                        id="session-subject"
                        value={selectedSubject}
                        onChange={(event) => setSelectedSubject(event.target.value)}
                        className={SELECT}
                      >
                        <option value="">No subject</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code ? `${subject.code} — ${subject.name}` : subject.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="primary"
                        onClick={() =>
                          void runAction(() => startSession(selectedSubject || null))
                        }
                        disabled={actionBusy || readOnly}
                      >
                        <Play className="h-4 w-4" aria-hidden="true" />
                        Start session
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {active && startedHours >= 12 ? (
                <p className="mt-3 rounded-md border border-line bg-surface-2 px-3 py-2 text-xs text-ink-muted">
                  This session has been open for {Math.round(startedHours)} hours — if you forgot
                  it, stop it to save the time or discard it.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-3">
            <div className="min-w-[7rem] flex-1 rounded-lg border border-line bg-surface px-5 py-4">
              <p className="text-[11px] uppercase tracking-wide text-ink-muted">Today</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                {formatDuration(todayMinutes * 60)}
              </p>
            </div>
            <div className="min-w-[7rem] flex-1 rounded-lg border border-line bg-surface px-5 py-4">
              <p className="text-[11px] uppercase tracking-wide text-ink-muted">This week</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                {formatDuration(weekMinutes * 60)}
              </p>
            </div>
          </div>

          <StudyHoursWidget
            days={weekDays}
            emptyHint="No sessions this week yet — start the timer above."
            className="mb-4"
          />

          <Card className="overflow-hidden">
            <CardHeader title="Recent sessions" subtitle={`Latest ${recentSessions.length} sessions`} />
            {recentSessions.length === 0 ? (
              <EmptyState
                icon={Timer}
                title="No sessions yet"
                description="Start your first session above — it will be saved to your account with its subject, duration, and notes."
              />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {recentSessions.map((session) => {
                  const badge = statusBadge(session.status)
                  const live = session.status === 'running' || session.status === 'paused'
                  return (
                    <li key={session.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm text-ink">
                            {subjectLabel(subjects, session.subjectId) || 'General study'}
                          </span>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                          <span className="text-xs tabular-nums text-ink-muted">
                            {formatDuration(
                              live ? elapsedSeconds(session, now) : session.durationSeconds,
                            )}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {formatRelativeTimestamp(session.startedAt, now)} at{' '}
                          {new Date(session.startedAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                        {session.note ? (
                          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{session.note}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleting(session)
                        }}
                        disabled={live || readOnly}
                        className={ICON_BUTTON}
                        title={live ? 'Stop the session before deleting it' : 'Delete session'}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">
                          Delete session from {formatRelativeTimestamp(session.startedAt, now)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      <Dialog
        open={stopOpen}
        onClose={() => {
          if (!stopBusy) setStopOpen(false)
        }}
        busy={stopBusy}
        title="Finish session"
        description="Add an optional note about what you worked on."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setStopOpen(false)}
              disabled={stopBusy}
            >
              Keep running
            </Button>
            <Button variant="danger" onClick={() => void handleDiscardFromDialog()} disabled={stopBusy}>
              {stopBusy ? 'Working…' : 'Discard'}
            </Button>
            <Button variant="primary" onClick={() => void handleStop()} disabled={stopBusy}>
              {stopBusy ? 'Saving…' : 'Save session'}
            </Button>
          </>
        }
      >
        <label htmlFor="session-note" className="mb-1.5 block text-sm font-medium text-ink">
          Note <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="session-note"
          value={stopNote}
          onChange={(event) => setStopNote(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What did you cover?"
          className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <p className="mt-2 text-xs text-ink-muted">
          Duration:{' '}
          {active ? formatDuration(elapsedSeconds(active, new Date())) : '0m'}
        </p>
        {stopError ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {stopError}
          </p>
        ) : null}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete session?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete session'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          This session will be permanently removed from your history and weekly totals. This can’t
          be undone.
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
