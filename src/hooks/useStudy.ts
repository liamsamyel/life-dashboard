import { useRef } from 'react'
import type { StudySession } from '../types'
import {
  activeSession,
  canStartSession,
  completeSession as buildCompleteSession,
  discardSession as buildDiscardSession,
  pauseSession as buildPauseSession,
  resumeSession as buildResumeSession,
  startSessionFields,
} from '../lib/study'
import { useCollection } from './useCollection'

export interface UseStudyResult {
  sessions: StudySession[]
  /** The one running/paused session, or null. Derived fresh each render. */
  active: StudySession | null
  loading: boolean
  error: string | null
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  startSession: (subjectId: string | null) => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  /** Finish the active session, attaching an optional note. */
  stopSession: (note: string | null) => Promise<void>
  discardActiveSession: () => Promise<void>
  removeSession: (id: string) => Promise<void>
}

/**
 * Study sessions, live from Firestore through `useCollection`.
 *
 * All timer math happens in `lib/study` against stored timestamps, so a
 * closed tab or reload never loses time — the page recomputes the elapsed
 * value from `segmentStartedAt` on mount. At most one session can be active:
 * `canStartSession` refuses a second start with a reason the UI shows, and
 * an in-flight guard blocks double-clicks before the snapshot catches up.
 */
export function useStudy(): UseStudyResult {
  const collection = useCollection<StudySession>('studySessions')
  const startingRef = useRef(false)

  const active = activeSession(collection.rows)

  function requireActive(): StudySession {
    const current = activeSession(collection.rows)
    if (!current) throw new Error('No session is running.')
    return current
  }

  async function startSession(subjectId: string | null): Promise<void> {
    if (startingRef.current) throw new Error('Starting your session…')
    const check = canStartSession(collection.rows)
    if (!check.ok) throw new Error(check.reason ?? 'Cannot start a session right now.')

    startingRef.current = true
    try {
      await collection.create({ ...startSessionFields(new Date()), subjectId })
    } finally {
      startingRef.current = false
    }
  }

  async function pauseSession(): Promise<void> {
    const current = requireActive()
    await collection.update(current.id, buildPauseSession(current, new Date()))
  }

  async function resumeSession(): Promise<void> {
    const current = requireActive()
    await collection.update(current.id, buildResumeSession(current, new Date()))
  }

  async function stopSession(note: string | null): Promise<void> {
    const current = requireActive()
    await collection.update(current.id, {
      ...buildCompleteSession(current, new Date()),
      note: note?.trim() || null,
    })
  }

  async function discardActiveSession(): Promise<void> {
    const current = requireActive()
    await collection.update(current.id, buildDiscardSession(current, new Date()))
  }

  async function removeSession(id: string): Promise<void> {
    await collection.remove(id)
  }

  return {
    sessions: collection.rows,
    active,
    loading: collection.loading,
    error: collection.error,
    readOnly: collection.readOnly,
    source: collection.source,
    reload: collection.reload,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    discardActiveSession,
    removeSession,
  }
}
