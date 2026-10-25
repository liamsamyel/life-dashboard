import { describe, expect, it } from 'vitest'
import type { StudySession } from '../types'
import {
  activeSession,
  canStartSession,
  completeSession,
  discardSession,
  elapsedSeconds,
  formatClock,
  isSessionActive,
  minutesForDate,
  pauseSession,
  resumeSession,
  startSessionFields,
} from './study'

const NOW = new Date(2026, 9, 24, 12, 0, 0) // Saturday, 24 October 2026, noon
const USER = 'user-1'

function iso(hour: number, minute = 0): string {
  return new Date(2026, 9, 24, hour, minute).toISOString()
}

function session(overrides: Partial<StudySession> & Pick<StudySession, 'id'>): StudySession {
  return {
    userId: USER,
    subjectId: null,
    projectId: null,
    startedAt: iso(8),
    endedAt: null,
    pausedSeconds: 0,
    durationSeconds: 0,
    status: 'completed',
    note: null,
    ...overrides,
  }
}

describe('elapsedSeconds', () => {
  it('adds the live segment to banked time while running', () => {
    // Banked 10 minutes from an earlier segment; current segment began 11:50.
    const running = session({
      id: 'r1',
      status: 'running',
      startedAt: iso(11, 30),
      segmentStartedAt: iso(11, 50),
      durationSeconds: 600,
    })
    expect(elapsedSeconds(running, NOW)).toBe(600 + 600) // banked + 10 min live
  })

  it('returns banked time while paused', () => {
    const paused = session({ id: 'p1', status: 'paused', durationSeconds: 900 })
    expect(elapsedSeconds(paused, NOW)).toBe(900)
  })

  it('falls back to startedAt for running docs written before segment tracking', () => {
    const legacy = session({ id: 'l1', status: 'running', startedAt: iso(11, 59), durationSeconds: 0 })
    expect(elapsedSeconds(legacy, NOW)).toBe(60)
  })

  it('never goes negative on clock skew', () => {
    const future = session({ id: 'f1', status: 'running', startedAt: iso(13), segmentStartedAt: iso(13) })
    expect(elapsedSeconds(future, NOW)).toBe(0)
  })
})

describe('session transitions', () => {
  it('pause banks the running segment', () => {
    const running = session({
      id: 'r1',
      status: 'running',
      startedAt: iso(11, 30),
      segmentStartedAt: iso(11, 50),
      durationSeconds: 600,
    })
    expect(pauseSession(running, NOW)).toEqual({
      status: 'paused',
      durationSeconds: 1200,
      segmentStartedAt: null,
    })
  })

  it('pause on an already-paused session is a no-op on time', () => {
    const paused = session({ id: 'p1', status: 'paused', durationSeconds: 900 })
    expect(pauseSession(paused, NOW)).toEqual({
      status: 'paused',
      durationSeconds: 900,
      segmentStartedAt: null,
    })
  })

  it('resume opens a new segment without touching banked time', () => {
    const paused = session({ id: 'p1', status: 'paused', durationSeconds: 900 })
    expect(resumeSession(paused, NOW)).toEqual({
      status: 'running',
      durationSeconds: 900,
      segmentStartedAt: NOW.toISOString(),
    })
  })

  it('complete banks final time and stamps endedAt', () => {
    const running = session({
      id: 'r1',
      status: 'running',
      startedAt: iso(11, 55),
      segmentStartedAt: iso(11, 55),
      durationSeconds: 0,
    })
    expect(completeSession(running, NOW)).toEqual({
      status: 'completed',
      durationSeconds: 300,
      segmentStartedAt: null,
      endedAt: NOW.toISOString(),
    })
  })

  it('discard cancels with the elapsed time recorded', () => {
    const running = session({ id: 'r1', status: 'running', startedAt: iso(11, 58), segmentStartedAt: iso(11, 58) })
    expect(discardSession(running, NOW)).toMatchObject({ status: 'cancelled', durationSeconds: 120 })
  })

  it('startSessionFields creates a fresh running session', () => {
    expect(startSessionFields(NOW)).toEqual({
      startedAt: NOW.toISOString(),
      segmentStartedAt: NOW.toISOString(),
      status: 'running',
      durationSeconds: 0,
      pausedSeconds: 0,
      endedAt: null,
      note: null,
    })
  })
})

describe('active session guard', () => {
  it('treats running and paused as active', () => {
    expect(isSessionActive(session({ id: 'a', status: 'running' }))).toBe(true)
    expect(isSessionActive(session({ id: 'a', status: 'paused' }))).toBe(true)
    expect(isSessionActive(session({ id: 'a', status: 'completed' }))).toBe(false)
    expect(isSessionActive(session({ id: 'a', status: 'cancelled' }))).toBe(false)
  })

  it('finds the one active session', () => {
    const sessions = [
      session({ id: 'done', status: 'completed' }),
      session({ id: 'live', status: 'paused' }),
    ]
    expect(activeSession(sessions)?.id).toBe('live')
    expect(activeSession([session({ id: 'done' })])).toBeNull()
  })

  it('refuses to start while another session is active, with a reason', () => {
    const blocked = canStartSession([session({ id: 'live', status: 'running' })])
    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toContain('already have a session')

    expect(canStartSession([])).toEqual({ ok: true, reason: null })
    expect(canStartSession([session({ id: 'done' })]).ok).toBe(true)
  })
})

describe('formatClock', () => {
  it('formats minutes and seconds below an hour', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(59 * 60 + 59)).toBe('59:59')
  })

  it('formats hours above an hour', () => {
    expect(formatClock(3600)).toBe('1:00:00')
    expect(formatClock(3661)).toBe('1:01:01')
    expect(formatClock(-5)).toBe('0:00')
  })
})

describe('minutesForDate', () => {
  it('sums completed and live sessions for the day, skipping cancelled and other days', () => {
    const sessions = [
      session({ id: 'a', status: 'completed', durationSeconds: 900 }), // 15 min today
      session({ id: 'b', status: 'cancelled', durationSeconds: 600 }), // ignored
      session({
        id: 'c',
        status: 'running',
        startedAt: iso(11, 59),
        segmentStartedAt: iso(11, 59),
        durationSeconds: 0, // 1 live minute
      }),
      session({
        id: 'd',
        status: 'completed',
        durationSeconds: 3600,
        startedAt: new Date(2026, 9, 23, 9).toISOString(), // yesterday
      }),
    ]
    expect(minutesForDate(sessions, '2026-10-24', NOW)).toBe(16)
    expect(minutesForDate(sessions, '2026-10-23', NOW)).toBe(60)
    expect(minutesForDate(sessions, '2026-10-25', NOW)).toBe(0)
  })
})
