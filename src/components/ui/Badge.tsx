import type { ReactNode } from 'react'
import type { Priority } from '../../types'
import { cn } from '../../lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'danger' | 'success'

/** Badge tone for a task's priority — the label still spells it out. */
export function priorityTone(priority: Priority): BadgeTone {
  if (priority === 'high') return 'danger'
  if (priority === 'medium') return 'accent'
  return 'neutral'
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line bg-surface-2 text-ink-muted',
  accent: 'border-accent/40 bg-accent/10 text-accent',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  success: 'border-success/40 bg-success/10 text-success',
}

interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

/**
 * Compact label. Text always states the status, so meaning never depends on
 * color alone.
 */
export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
