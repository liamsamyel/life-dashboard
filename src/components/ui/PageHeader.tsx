import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description: string
  /** Right-aligned actions (buttons). */
  actions?: ReactNode
}

/** Page-level heading used by every section for a consistent rhythm. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
