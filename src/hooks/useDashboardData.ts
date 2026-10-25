import { useEffect, useMemo, useState } from 'react'
import { buildSampleData } from '../data/sample'
import { fetchAllUserData } from '../lib/firestore'
import type { DashboardData } from '../types'
import { useAuth } from './useAuth'
import { primePreferences } from './usePreferences'

export interface DashboardState {
  /** Null while a Firestore load is in flight or has failed. */
  data: DashboardData | null
  /** Where the data came from — shown to the user so sample and real data never blur together. */
  source: 'sample' | 'firestore'
  loading: boolean
  error: string | null
  /** Re-run the Firestore load (used by the error state's retry button). */
  reload: () => void
}

/**
 * The dashboard's single data seam.
 *
 * Three modes:
 *   * Firebase not configured  → development sample data (stage 1–2 behavior).
 *   * Firebase configured      → sign-in required (route guard); once signed
 *     in, all dashboard data is read from Firestore through `lib/firestore`,
 *     scoped to the user by `userId` + security rules.
 *   * Load failure             → error + retry, never a silent fallback to
 *     sample data (that would lie about what you're looking at).
 */
export function useDashboardData(): DashboardState {
  const { status, user } = useAuth()
  const sampleData = useMemo(() => buildSampleData(), [])

  const [remote, setRemote] = useState<{ data: DashboardData | null; error: string | null }>({
    data: null,
    error: null,
  })
  const [attempt, setAttempt] = useState(0)

  const uid = user?.uid ?? null

  useEffect(() => {
    if (status !== 'signedIn' || !uid) {
      setRemote({ data: null, error: null })
      return
    }

    let cancelled = false
    setRemote({ data: null, error: null })

    fetchAllUserData({
      uid,
      displayName: user?.displayName ?? null,
      email: user?.email ?? null,
    })
      .then((data) => {
        if (cancelled) return
        // The dashboard already loaded the profile — share it with the
        // preferences store so Settings/due-dates don't fetch it again.
        primePreferences(data.profile)
        setRemote({ data, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setRemote({
          data: null,
          error: error instanceof Error ? error.message : 'Something went wrong while loading your data.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [status, uid, user?.displayName, attempt])

  const reload = (): void => setAttempt((value) => value + 1)

  // Sample-data mode: Firebase not configured, still checking the session,
  // or momentarily signed out (the route guard redirects in that case).
  if (status !== 'signedIn') {
    return { data: sampleData, source: 'sample', loading: false, error: null, reload }
  }

  const firstLoad = !remote.data && !remote.error
  return {
    data: remote.data,
    source: 'firestore',
    loading: firstLoad,
    error: remote.error,
    reload,
  }
}
