import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isFirebaseConfigured } from '../lib/firebase'
import { signIn, signUp, useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { KeyRound } from 'lucide-react'

type Mode = 'signin' | 'signup'

/**
 * Auth entry point (stage 6, pulled forward). Validates input, shows
 * user-facing errors from `lib/errors`, and redirects into the app once
 * Firebase reports a signed-in user.
 */
export default function SignInPage() {
  const { status } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Already signed in (or just completed sign-in) → into the app.
  useEffect(() => {
    if (status === 'signedIn') navigate('/', { replace: true })
  }, [status, navigate])

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-xl">
          <EmptyState
            icon={KeyRound}
            title="Sign-in isn’t configured yet"
            description={
              import.meta.env.PROD
                ? 'Add the Firebase web app settings as repository Actions variables, then run the GitHub Pages deployment again.'
                : 'Copy .env.example to .env, add your Firebase web app settings, and restart the dev server. Local development uses sample data until Firebase is configured.'
            }
          />
        </Card>
      </div>
    )
  }

  function switchMode(next: Mode): void {
    setMode(next)
    setFieldError(null)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setFormError(null)
    setFieldError(null)

    const trimmedEmail = email.trim()

    // Client-side validation first so users aren't charged a round trip.
    if (mode === 'signup' && displayName.trim().length === 0) {
      setFieldError('Enter a name to show on your dashboard.')
      return
    }
    if (password.length < 6) {
      setFieldError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(trimmedEmail, password)
      } else {
        await signUp(trimmedEmail, password, displayName.trim())
      }
      // The auth listener flips status to signedIn; the effect above routes home.
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const isSignIn = mode === 'signin'

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="h-7 w-7 rounded-md bg-accent" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight text-ink">LifeOS</span>
        </div>

        <Card>
          <CardHeader
            title={isSignIn ? 'Sign in' : 'Create your account'}
            subtitle={
              isSignIn
                ? 'Your tasks, habits, and finances — private to you.'
                : 'A quick account so your data stays yours.'
            }
          />
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {!isSignIn ? (
                <Input
                  label="Name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  placeholder="Miguel Santos"
                  required
                />
              ) : null}

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                error={fieldError ?? undefined}
                hint={isSignIn ? undefined : 'At least 6 characters.'}
                required
                minLength={6}
              />

              {formError ? (
                <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              ) : null}

              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy ? 'Please wait…' : isSignIn ? 'Sign in' : 'Create account'}
              </Button>

              <p className="text-center text-sm text-ink-muted">
                {isSignIn ? 'New to LifeOS? ' : 'No account yet? '}
                <button
                  type="button"
                  onClick={() => switchMode(isSignIn ? 'signup' : 'signin')}
                  className="font-medium text-accent hover:underline"
                >
                  {isSignIn ? 'Create one' : 'Sign up'}
                </button>
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
