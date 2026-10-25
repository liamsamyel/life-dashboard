import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  className?: string
  children: ReactNode
}

/** Surface container: solid background, one subtle border, rounded-lg. */
export function Card({ className, children }: CardProps) {
  return <section className={cn('rounded-lg border border-line bg-surface', className)}>{children}</section>
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  /** Right-aligned slot, usually a "View all" link. */
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-xs">{action}</div> : null}
    </div>
  )
}

interface CardBodyProps {
  className?: string
  children: ReactNode
}

/** Content area separated from the header by a hairline border. */
export function CardBody({ className, children }: CardBodyProps) {
  return <div className={cn('border-t border-line px-5 py-4', className)}>{children}</div>
}
