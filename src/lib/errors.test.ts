import { describe, expect, it } from 'vitest'
import { authErrorMessage, dataErrorMessage, errorCodeOf } from './errors'

describe('errorCodeOf', () => {
  it('reads the code from Firebase-style errors', () => {
    expect(errorCodeOf({ code: 'auth/invalid-email' })).toBe('auth/invalid-email')
    expect(errorCodeOf(new Error('boom'))).toBe('')
    expect(errorCodeOf(null)).toBe('')
    expect(errorCodeOf({ code: 42 })).toBe('')
  })
})

describe('authErrorMessage', () => {
  it('maps sign-in failures to actionable messages', () => {
    expect(authErrorMessage('auth/invalid-credential')).toBe('Incorrect email or password.')
    expect(authErrorMessage('auth/wrong-password')).toBe('Incorrect email or password.')
    expect(authErrorMessage('auth/email-already-in-use')).toContain('already exists')
    expect(authErrorMessage('auth/weak-password')).toContain('at least 6')
    expect(authErrorMessage('auth/invalid-email')).toContain('email address')
    expect(authErrorMessage('auth/too-many-requests')).toContain('Too many')
    expect(authErrorMessage('auth/network-request-failed')).toContain('Network')
    expect(authErrorMessage('auth/operation-not-allowed')).toContain('Firebase console')
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(authErrorMessage('auth/something-new')).toBe('Something went wrong. Please try again.')
    expect(authErrorMessage('')).toBe('Something went wrong. Please try again.')
  })
})

describe('dataErrorMessage', () => {
  it('explains permission and connectivity failures', () => {
    expect(dataErrorMessage('permission-denied')).toContain('access')
    expect(dataErrorMessage('unavailable')).toContain('connection')
    expect(dataErrorMessage('deadline-exceeded')).toContain('retry')
    expect(dataErrorMessage('not-found')).toContain('Create database')
  })

  it('uses the fallback for unknown codes', () => {
    expect(dataErrorMessage('already-exists')).toBe('Something went wrong while loading your data.')
    expect(dataErrorMessage('already-exists', 'Custom problem.')).toBe('Custom problem.')
  })
})
