import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { updateDisplayName, useAuth } from '../hooks/useAuth'
import { usePreferences } from '../hooks/usePreferences'
import { useTheme } from '../hooks/useTheme'
import { cn } from '../lib/cn'
import { formatDate } from '../lib/format'
import {
  DEFAULT_LEAD_DAYS,
  LEAD_DAY_OPTIONS,
  isValidEmail,
  normalizeLeadDays,
} from '../lib/notifications'
import type { DateFormat, Profile } from '../types'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'

interface SaveStatus {
  busy: boolean
  message: string | null
  tone: 'idle' | 'saved' | 'error'
}

const IDLE: SaveStatus = { busy: false, message: null, tone: 'idle' }

const THEME_OPTIONS: Array<{ value: Profile['theme']; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
]

const DATE_FORMATS: DateFormat[] = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']

const FALLBACK_TIME_ZONES = [
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
]

function timeZoneOptions(current?: string | null): string[] {
  let list = FALLBACK_TIME_ZONES
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    if (typeof intl.supportedValuesOf === 'function') {
      const values = intl.supportedValuesOf('timeZone')
      if (values.length > 0) list = values
    }
  } catch {
    // Keep the curated fallback list.
  }
  if (current && !list.includes(current)) list = [current, ...list]
  return list
}

const SELECT_CLASS =
  'h-9 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60'

function StatusNote({ status }: { status: SaveStatus }) {
  if (!status.message) return null
  if (status.tone === 'error') {
    return (
      <p
        role="alert"
        className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
      >
        {status.message}
      </p>
    )
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-success">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      {status.message}
    </p>
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save. Please try again.'
}

/**
 * Settings (stage 6 completion): account name + email, and preferences
 * (theme, time zone, date format) persisted to `users/{uid}` — the time zone
 * drives the dashboard's date and greeting, the date format drives every
 * full-date display.
 */
export default function SettingsPage() {
  const { status, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { profile, loading, error, savePreferences, reload } = usePreferences()
  const signedIn = status === 'signedIn' && user !== null

  const [displayName, setDisplayName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [accountStatus, setAccountStatus] = useState<SaveStatus>(IDLE)
  const [prefStatus, setPrefStatus] = useState<SaveStatus>(IDLE)

  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [leadDays, setLeadDays] = useState<number>(DEFAULT_LEAD_DAYS)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [notifyStatus, setNotifyStatus] = useState<SaveStatus>(IDLE)

  // Sync the field only when the *stored name* changes — not on every profile
  // update, so saving a preference (which rewrites the same doc) can't wipe
  // what the user is currently typing.
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName)
      setNameError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.displayName])

  // Same rule for the reminder fields: only re-sync when the stored values
  // change, so saving another preference never overwrites what's being typed.
  useEffect(() => {
    if (!profile) return
    setNotifyEmail(profile.email || user?.email || '')
    // Documents created before this feature default to reminders on.
    setNotifyEnabled(profile.notifyEmail !== false)
    setLeadDays(normalizeLeadDays(profile.deadlineLeadDays))
    setEmailError(null)
    // `profile?.id` is in the list because a profile written by an older build
    // has none of the three fields above — without it the effect would see the
    // same (undefined) values before and after the load and never re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.email, profile?.notifyEmail, profile?.deadlineLeadDays, user?.email])

  const timeZones = useMemo(() => timeZoneOptions(profile?.timeZone), [profile?.timeZone])
  const todayPreview = useMemo(() => new Date(), [])

  async function handleAccountSave(event: FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = displayName.trim()
    if (trimmed.length === 0) {
      setNameError('Enter a name to show on your dashboard.')
      return
    }
    if (trimmed.length > 80) {
      setNameError('Keep your name to 80 characters or fewer.')
      return
    }
    setNameError(null)
    setAccountStatus({ busy: true, message: null, tone: 'idle' })
    try {
      await updateDisplayName(trimmed)
      await savePreferences({ displayName: trimmed })
      setAccountStatus({ busy: false, message: 'Saved', tone: 'saved' })
    } catch (saveError) {
      setAccountStatus({ busy: false, message: errorMessage(saveError), tone: 'error' })
    }
  }

  async function savePreference(patch: Partial<Profile>): Promise<void> {
    setPrefStatus({ busy: true, message: null, tone: 'idle' })
    try {
      await savePreferences(patch)
      setPrefStatus({ busy: false, message: 'Saved', tone: 'saved' })
    } catch (saveError) {
      setPrefStatus({ busy: false, message: errorMessage(saveError), tone: 'error' })
    }
  }

  async function handleNotifySave(event: FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = notifyEmail.trim()
    if (!isValidEmail(trimmed)) {
      setEmailError('Enter the email address that should receive reminders.')
      return
    }
    setEmailError(null)
    setNotifyStatus({ busy: true, message: null, tone: 'idle' })
    try {
      await savePreferences({
        email: trimmed,
        notifyEmail: notifyEnabled,
        deadlineLeadDays: leadDays,
      })
      setNotifyStatus({ busy: false, message: 'Saved', tone: 'saved' })
    } catch (saveError) {
      setNotifyStatus({ busy: false, message: errorMessage(saveError), tone: 'error' })
    }
  }

  function chooseTheme(value: Profile['theme']): void {
    setTheme(value) // instant on this device
    if (signedIn) void savePreference({ theme: value })
  }

  const themeFieldset = (
    <fieldset disabled={prefStatus.busy}>
      <legend className="mb-2 text-sm font-medium text-ink">Theme</legend>
      <div className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map((option) => {
          const selected = theme === option.value
          const Icon = option.icon
          return (
            <label key={option.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={selected}
                onChange={() => chooseTheme(option.value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors duration-150',
                  selected
                    ? 'border-accent bg-surface-2 text-ink'
                    : 'border-line text-ink-muted hover:text-ink',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {option.label}
                {selected ? <Check className="h-4 w-4 text-accent" aria-hidden="true" /> : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )

  if (!signedIn) {
    return (
      <div>
        <PageHeader title="Settings" description="Your profile, preferences, and account." />
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Appearance"
              subtitle="Dark is the default. Your choice is saved on this device."
            />
            <CardBody>{themeFieldset}</CardBody>
          </Card>
          <Card>
            <CardHeader title="Account & preferences" subtitle="Available when signed in" />
            <CardBody>
              <p className="text-sm leading-relaxed text-ink-muted">
                Sample-data mode: configure Firebase in{' '}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env</code> and sign in
                to save your name, time zone, and date format to your account — they'll sync
                across devices. Your dashboard data stays private to your account through
                Firestore security rules.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  if (loading && !profile && !error) {
    return (
      <div>
        <PageHeader title="Settings" description="Your profile, preferences, and account." />
        <LoadingState label="Loading your settings…" />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div>
        <PageHeader title="Settings" description="Your profile, preferences, and account." />
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Settings" description="Your profile, preferences, and account." />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Account" subtitle="Shown in the sidebar and used for greetings" />
          <CardBody>
            <form onSubmit={(event) => void handleAccountSave(event)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Display name"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value)
                    setNameError(null)
                  }}
                  error={nameError ?? undefined}
                  maxLength={80}
                  autoComplete="name"
                  required
                />
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
                  <p className="truncate rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink-muted">
                    {user?.email}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-muted">Used to sign in — can’t be changed here.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary" disabled={accountStatus.busy}>
                  {accountStatus.busy ? 'Saving…' : 'Save account'}
                </Button>
                <StatusNote status={accountStatus} />
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Preferences"
            subtitle="Saved to your account and applied across the app"
          />
          <CardBody>
            <div className="space-y-5">
              <div>
                {themeFieldset}
                <p className="mt-2 text-xs text-ink-muted">
                  Applies instantly and syncs to your account.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Time zone</span>
                  <select
                    value={profile?.timeZone ?? 'Asia/Manila'}
                    onChange={(event) => void savePreference({ timeZone: event.target.value })}
                    disabled={prefStatus.busy}
                    className={cn(SELECT_CLASS, 'w-full')}
                  >
                    {timeZones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1.5 block text-xs text-ink-muted">
                    Drives the dashboard date and greeting.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Date format</span>
                  <select
                    value={profile?.dateFormat ?? 'YYYY-MM-DD'}
                    onChange={(event) =>
                      void savePreference({ dateFormat: event.target.value as DateFormat })
                    }
                    disabled={prefStatus.busy}
                    className={cn(SELECT_CLASS, 'w-full')}
                  >
                    {DATE_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format} — {formatDate(todayPreview, format)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1.5 block text-xs text-ink-muted">
                    Used for full dates, including far-off due dates.
                  </span>
                </label>
              </div>

              <StatusNote status={prefStatus} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Email reminders"
            subtitle="A daily digest of Planner deadlines and unpaid bills, sent by a scheduled function"
          />
          <CardBody>
            <form onSubmit={(event) => void handleNotifySave(event)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Send reminders to"
                  type="email"
                  value={notifyEmail}
                  onChange={(event) => {
                    setNotifyEmail(event.target.value)
                    setEmailError(null)
                  }}
                  error={emailError ?? undefined}
                  hint="Defaults to your sign-in email."
                  autoComplete="email"
                  spellCheck={false}
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Warn me</span>
                  <select
                    value={leadDays}
                    onChange={(event) => setLeadDays(Number(event.target.value))}
                    disabled={!notifyEnabled}
                    className={cn(SELECT_CLASS, 'w-full')}
                  >
                    {LEAD_DAY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} {option === 1 ? 'day' : 'days'} before the due date
                      </option>
                    ))}
                  </select>
                  <span className="mt-1.5 block text-xs text-ink-muted">
                    Overdue deadlines and bills are always included.
                  </span>
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-md border border-line bg-surface-2 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={notifyEnabled}
                  onChange={(event) => setNotifyEnabled(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                />
                <span>
                  <span className="block text-sm text-ink">
                    Email me about deadlines and bill dues
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                    Planner deadlines and unpaid bills due — or already overdue — are summarized
                    once a day at about 08:07 Asia/Manila.
                  </span>
                </span>
              </label>

              <p className="text-xs leading-relaxed text-ink-muted">
                The digest runs from GitHub Actions, so it arrives even when LifeOS isn’t open.
                Add the GitHub Actions secrets and enable the workflow as described in the README.
              </p>

              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary" disabled={notifyStatus.busy}>
                  {notifyStatus.busy ? 'Saving…' : 'Save reminders'}
                </Button>
                <StatusNote status={notifyStatus} />
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Security" subtitle="How your data is protected" />
          <CardBody>
            <p className="text-sm leading-relaxed text-ink-muted">
              Everything you save belongs to your account: Firestore security rules scope every
              read and write to your user ID, so no one else can see your records. Sign out any
              time from the sidebar — your data stays in your account, not on this device.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
