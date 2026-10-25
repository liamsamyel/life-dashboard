import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import RouteErrorBoundary from './RouteErrorBoundary'
import Sidebar from './Sidebar'
import { navLabelFor } from './nav'

/**
 * Layout chrome shared by every route:
 *   * persistent sidebar on desktop (lg+),
 *   * sticky top bar with an accessible slide-in drawer on smaller screens,
 *   * skip link, main landmark, and one <h1> per page (from PageHeader).
 */
export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Drawer behavior: Escape closes, focus moves in on open and back on close,
  // background scrolling is locked while open.
  useEffect(() => {
    if (!menuOpen) {
      if (wasOpen.current) {
        wasOpen.current = false
        menuButtonRef.current?.focus()
      }
      return
    }

    wasOpen.current = true
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="min-h-[100svh] bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-md focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 hidden border-r border-line lg:block">
        <Sidebar />
      </div>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas lg:hidden">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="h-5 w-5 shrink-0 rounded bg-accent" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">LifeOS</span>
            <span aria-hidden="true" className="text-ink-muted">
              /
            </span>
            <span className="truncate text-sm text-ink-muted">{navLabelFor(location.pathname)}</span>
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-line bg-surface"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-2 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          {/* A crashing page shows a recoverable card; the sidebar survives. */}
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  )
}
