import { Moon, Sun } from 'lucide-react'
import { savePreferences } from '../../hooks/usePreferences'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'

/**
 * Quick dark/light switch for the sidebar. The visible label states the
 * current theme; the accessible name states what clicking will do. When
 * signed in, the choice is also saved to the account profile.
 */
export default function ThemeToggle() {
  const { resolved, setTheme } = useTheme()
  const { status, user } = useAuth()
  const uid = status === 'signedIn' && user ? user.uid : null
  const next = resolved === 'dark' ? 'light' : 'dark'
  const Icon = resolved === 'dark' ? Moon : Sun

  function toggle(): void {
    setTheme(next)
    if (uid) {
      // Device applies instantly; syncing the profile is best-effort here
      // (Settings surfaces the same save with full error feedback).
      void savePreferences(uid, { theme: next }).catch((error: unknown) => {
        console.error('Could not sync theme to profile:', error)
      })
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{resolved === 'dark' ? 'Dark theme' : 'Light theme'}</span>
    </button>
  )
}
