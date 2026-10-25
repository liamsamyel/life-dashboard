import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { signOut, useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/cn'
import ThemeToggle from './ThemeToggle'
import { NAV_ITEMS } from './nav'

interface SidebarProps {
  /** Closes the mobile drawer after navigating. */
  onNavigate?: () => void
  className?: string
}

/**
 * Primary navigation. Rendered once on desktop (persistent, fixed left) and
 * once inside the mobile drawer. NavLink sets `aria-current="page"` on the
 * active item, and the active row is marked by an accent rail plus a solid
 * background — never color alone.
 */
export default function Sidebar({ onNavigate, className }: SidebarProps) {
  const { status, user } = useAuth()

  async function handleSignOut(): Promise<void> {
    try {
      await signOut()
    } catch (error) {
      // Surface rather than swallow: sign-out failures are rare but real
      // (offline, revoked session), and the user stays visibly signed in.
      console.error('Sign out failed:', error)
    }
  }

  return (
    <aside className={cn('flex h-full w-60 flex-col bg-surface', className)}>
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4 pr-12 lg:pr-5">
        <span className="h-6 w-6 shrink-0 rounded-md bg-accent" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight text-ink">LifeOS</span>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors duration-150',
                    isActive
                      ? 'border-accent bg-surface-2 font-medium text-ink'
                      : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3">
        {status === 'signedIn' && user ? (
          <div className="mb-2 px-3 pb-2">
            <p className="truncate text-sm font-medium text-ink">
              {user.displayName?.trim() || 'Signed in'}
            </p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-xs font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        ) : null}
        <ThemeToggle />
      </div>
    </aside>
  )
}
