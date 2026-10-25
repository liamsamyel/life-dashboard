/**
 * Turn SDK error codes into messages a person can act on.
 * Pure functions so they are unit-testable; components never show raw
 * `auth/...` or `permission-denied` codes to the user.
 */

/** Extract the `code` property from a Firebase (or any) error object. */
export function errorCodeOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string') return code
  }
  return ''
}

/** Firebase Auth error code → user-facing message. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists — try signing in instead.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':
      return 'That email address doesn’t look valid.'
    case 'auth/missing-password':
      return 'Enter your password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in isn’t enabled yet — turn it on in the Firebase console (Authentication → Sign-in method).'
    default:
      return 'Something went wrong. Please try again.'
  }
}

/** Firestore error code → user-facing message. */
export function dataErrorMessage(code: string, fallback = ''): string {
  switch (code) {
    case 'permission-denied':
      return 'You don’t have access to that data. Check that you’re signed in and that firestore.rules is published.'
    case 'not-found':
      return 'That Firestore database doesn’t exist yet — create it in the Firebase console (Firestore Database → Create database).'
    case 'unavailable':
      return 'Can’t reach the database right now. Check your connection and retry.'
    case 'deadline-exceeded':
      return 'The request took too long. Please retry.'
    case 'failed-precondition':
      return 'That change isn’t allowed right now. Refresh and try again.'
    default:
      return fallback || 'Something went wrong while loading your data.'
  }
}
