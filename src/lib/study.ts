import type { StudySession, StudySessionStatus } from '../types'
import { startOfDay, toISODate } from './dates'

/**
 * Pure study-session logic: the timer state machine and totals.
 *
 * Timer model — `durationSeconds` banks time from finished segments;
 * `segmentStartedAt` marks when the current running segment began:
 *
 *   start   → durationSeconds = 0,                segmentStartedAt = now
 *   pause   → durationSeconds = elapsed so far,   segmentStartedAt = null
 *   resume  → segmentStartedAt = now              (durationSeconds unchanged)
 *   stop    → durationSeconds = final elapsed,    endedAt = now
 *
 * Because elapsed time is always derived from stored timestamps, a closed
 * tab or reload never loses or duplicates time — the page just recomputes.
 * Each transition returns a plain patch the hook writes to Firestore.
 */

export function isSessionActive(session: StudySession): boolean {
  return session.status === 'running' || session.status === 'paused'
}

/** The one session that may currently be active (at most one by design). */
export function activeSession(sessions: StudySession[]): StudySession | null {
  return sessions.find(isSessionActive) ?? null
}

/** Start of the current running segment (older docs may lack the field). */
function segmentStart(session: StudySession): Date {
  return new Date(session.segmentStartedAt ?? session.startedAt)
}

/** Total seconds elapsed on a session at `now` (banked + current segment). */
export function elapsedSeconds(session: StudySession, now: Date): number {
  const banked = Math.max(0, session.durationSeconds)
  if (session.status !== 'running') return banked
  const since = (now.getTime() - segmentStart(session).getTime()) / 1000
  return Math.floor(banked + Math.max(0, since))
}

/** A partial session document, written straight through `updateRecord`. */
export type SessionPatch = {
  status: StudySessionStatus
  durationSeconds: number
  segmentStartedAt: string | null
  endedAt?: string | null
}

/** Bank the running segment's time. Idempotent when already paused. */
export function pauseSession(session: StudySession, now: Date): SessionPatch {
  return {
    status: 'paused',
    durationSeconds: elapsedSeconds(session, now),
    segmentStartedAt: null,
  }
}

/** Begin a new running segment from `now`; idempotent when already running. */
export function resumeSession(session: StudySession, now: Date): SessionPatch {
  if (session.status === 'running') {
    return {
      status: 'running',
      durationSeconds: session.durationSeconds,
      segmentStartedAt: session.segmentStartedAt ?? session.startedAt,
    }
  }
  return { status: 'running', durationSeconds: session.durationSeconds, segmentStartedAt: now.toISOString() }
}

/** Finish the session: final duration plus an end timestamp. */
export function completeSession(session: StudySession, now: Date): SessionPatch {
  return {
    status: 'completed',
    durationSeconds: elapsedSeconds(session, now),
    segmentStartedAt: null,
    endedAt: now.toISOString(),
  }
}

/** Throw the session away (interrupted / started by mistake). */
export function discardSession(session: StudySession, now: Date): SessionPatch {
  return {
    status: 'cancelled',
    durationSeconds: elapsedSeconds(session, now),
    segmentStartedAt: null,
    endedAt: now.toISOString(),
  }
}

/** Document fields for a fresh running session (used by the create path). */
export function startSessionFields(now: Date): {
  startedAt: string
  segmentStartedAt: string
  status: 'running'
  durationSeconds: number
  pausedSeconds: number
  endedAt: null
  note: null
} {
  const iso = now.toISOString()
  return {
    startedAt: iso,
    segmentStartedAt: iso,
    status: 'running',
    durationSeconds: 0,
    pausedSeconds: 0,
    endedAt: null,
    note: null,
  }
}

export interface StartCheck {
  ok: boolean
  reason: string | null
}

/**
 * At most one active session per user: starting while another session is
 * running or paused is refused with a reason the UI shows verbatim.
 */
export function canStartSession(sessions: StudySession[]): StartCheck {
  if (activeSession(sessions) !== null) {
    return {
      ok: false,
      reason: 'You already have a session in progress — stop or discard it first.',
    }
  }
  return { ok: true, reason: null }
}

/** Timer display: `M:SS` under an hour, `H:MM:SS` after it. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
  return `${minutes}:${rest}`
}

/**
 * Minutes logged on a calendar day, including the live time of any session
 * still running or paused on that day. Cancelled sessions never count.
 */
export function minutesForDate(
  sessions: StudySession[],
  isoDate: string,
  now: Date,
): number {
  let seconds = 0
  for (const session of sessions) {
    if (session.status === 'cancelled') continue
    if (toISODate(startOfDay(new Date(session.startedAt))) !== isoDate) continue
    seconds += isSessionActive(session)
      ? elapsedSeconds(session, now)
      : session.durationSeconds
  }
  return Math.round(seconds / 60)
}
