import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

/** Centered message for empty lists and sections that are not built yet. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
