import {
  Bookmark,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Settings,
  StickyNote,
  Timer,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Exact-match only (the overview route). */
  end?: boolean
}

/** Single source of truth for the sidebar sections. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/habits', label: 'Habits', icon: Repeat },
  { to: '/planner', label: 'Academic Planner', icon: GraduationCap },
  { to: '/study', label: 'Study Tracker', icon: Timer },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Section label for the current path (used in the mobile top bar). */
export function navLabelFor(pathname: string): string {
  const match = NAV_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
  return match?.label ?? 'Overview'
}
