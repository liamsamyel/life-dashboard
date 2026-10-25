import { useEffect, useState, useSyncExternalStore } from 'react'
import { loadProfile, saveProfile } from '../lib/firestore'
import type { Profile } from '../types'
import { getStoredTheme, setTheme } from './useTheme'
import { useAuth } from './useAuth'

export interface PreferencesState {
  /** The signed-in user's profile document, or null before load / when signed out. */
  profile: Profile | null
  loading: boolean
  error: string | null
  /** Which user the state belongs to, so a different account refetches. */
  loadedForUid: string | null
}

/**
 * Account preferences (theme, time zone, date format) as a shared store —
 * the Settings page writes it, and the dashboard, due-date labels, and theme
 * toggle all read it without prop drilling.
 *
 * The dashboard's data fetch primes this store with the profile it already
 * loaded (`primePreferences`), so no page pays for the profile twice.
 */
let state: PreferencesState = { profile: null, loading: false, error: null, loadedForUid: null }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): PreferencesState {
  return state
}

function setState(patch: Partial<PreferencesState>): void {
  state = { ...state, ...patch }
  emit()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save your preferences.'
}

/** A device that never picked a theme adopts the account's theme once. */
function seedDeviceTheme(profile: Profile): void {
  if (getStoredTheme() === null) {
    setTheme(profile.theme)
  }
}

/** Called with the profile the dashboard fetch already loaded. */
export function primePreferences(profile: Profile): void {
  setState({ profile, loading: false, error: null, loadedForUid: profile.id })
  seedDeviceTheme(profile)
}

/** Load the profile once per signed-in user (no-op when already loaded). */
export async function ensurePreferences(uid: string): Promise<void> {
  if (state.loadedForUid === uid) return
  setState({ loading: true, error: null })
  try {
    const profile = await loadProfile(uid)
    if (profile) {
      setState({ profile, loading: false, error: null, loadedForUid: uid })
      seedDeviceTheme(profile)
    } else {
      setState({ loading: false, loadedForUid: uid })
    }
  } catch (error) {
    setState({ loading: false, error: errorMessage(error) })
  }
}

/** Persist a preference patch and update the store; applies theme instantly. */
export async function savePreferences(uid: string, patch: Partial<Profile>): Promise<Profile> {
  const profile = await saveProfile(uid, patch)
  setState({ profile, error: null, loadedForUid: uid })
  if (patch.theme) setTheme(patch.theme)
  return profile
}

export function resetPreferences(): void {
  setState({ profile: null, loading: false, error: null, loadedForUid: null })
}

export interface UsePreferencesResult extends PreferencesState {
  /** Bound to the signed-in user; rejects when signed out. */
  savePreferences: (patch: Partial<Profile>) => Promise<Profile>
  reload: () => void
}

export function usePreferences(): UsePreferencesResult {
  const { status, user } = useAuth()
  const uid = status === 'signedIn' && user ? user.uid : null
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (uid) {
      void ensurePreferences(uid)
    } else {
      resetPreferences()
    }
  }, [uid, attempt])

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...snapshot,
    savePreferences: async (patch) => {
      if (!uid) throw new Error('Sign in to save preferences.')
      return savePreferences(uid, patch)
    },
    reload: () => setAttempt((value) => value + 1),
  }
}
