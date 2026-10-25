import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { useSyncExternalStore } from 'react'
import { authErrorMessage, errorCodeOf } from '../lib/errors'
import { auth } from '../lib/firebase'

export type AuthStatus = 'loading' | 'unconfigured' | 'signedOut' | 'signedIn'

export interface AuthState {
  status: AuthStatus
  user: User | null
}

/**
 * Module-level auth store (same pattern as useTheme): Firebase's
 * `onAuthStateChanged` is the single source of truth, and every consumer —
 * route guard, sidebar, data hook — reads the same snapshot.
 *
 * When Firebase isn't configured (`auth === null`) the status is
 * `unconfigured`, which keeps the app running on sample data during
 * development.
 */
let current: AuthState = auth ? { status: 'loading', user: null } : { status: 'unconfigured', user: null }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): AuthState {
  return current
}

if (auth) {
  onAuthStateChanged(
    auth,
    (user) => {
      current = user ? { status: 'signedIn', user } : { status: 'signedOut', user: null }
      emit()
    },
    (error) => {
      // Not silent: the failure is logged, and the app falls back to a
      // signed-out state so the sign-in page (which surfaces errors) appears.
      console.error('Firebase auth state listener failed:', error)
      current = { status: 'signedOut', user: null }
      emit()
    },
  )
}

function requireAuth() {
  if (!auth) throw new Error('Firebase is not configured yet — fill in .env first.')
  return auth
}

/** Sign in with email + password. Throws an Error with a user-facing message. */
export async function signIn(email: string, password: string): Promise<void> {
  const client = requireAuth()
  try {
    await signInWithEmailAndPassword(client, email, password)
  } catch (error) {
    throw new Error(authErrorMessage(errorCodeOf(error)))
  }
}

/** Send a password reset email without revealing whether the email is registered. */
export async function sendPasswordReset(email: string): Promise<void> {
  const client = requireAuth()
  try {
    await firebaseSendPasswordResetEmail(client, email)
  } catch (error) {
    // Keep the response generic even when Firebase email-enumeration protection
    // is disabled and it reports that no account exists for this address.
    if (errorCodeOf(error) === 'auth/user-not-found') return
    throw new Error(authErrorMessage(errorCodeOf(error)))
  }
}

/** Create an account, store the display name, and let the listener sign it in. */
export async function signUp(email: string, password: string, displayName: string): Promise<void> {
  const client = requireAuth()
  try {
    await createUserWithEmailAndPassword(client, email, password)
    if (displayName) {
      await updateDisplayName(displayName)
    }
  } catch (error) {
    throw new Error(authErrorMessage(errorCodeOf(error)))
  }
}

/** Update the signed-in user's display name (auth profile) and notify subscribers. */
export async function updateDisplayName(displayName: string): Promise<void> {
  const client = requireAuth()
  try {
    if (!client.currentUser) throw new Error('No signed-in user.')
    await updateProfile(client.currentUser, { displayName })
    await client.currentUser.reload()
    // Push the refreshed user to subscribers — `onAuthStateChanged` does not
    // re-fire on profile updates.
    if (client.currentUser) {
      current = { status: 'signedIn', user: client.currentUser }
      emit()
    }
  } catch (error) {
    throw new Error(authErrorMessage(errorCodeOf(error)))
  }
}

/** Sign out. Returns a promise so callers can handle failures explicitly. */
export async function signOut(): Promise<void> {
  const client = requireAuth()
  try {
    await firebaseSignOut(client)
  } catch (error) {
    throw new Error(authErrorMessage(errorCodeOf(error)))
  }
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
