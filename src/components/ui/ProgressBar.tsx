import { cn } from '../../lib/cn'

interface ProgressBarProps {
  value: number
  max?: number
  /** Accessible name, e.g. "Today's task completion". */
  label: string
  /** Switch the fill to the danger color (used for over-budget states). */
  tone?: 'accent' | 'danger'
  className?: string
}

/**
 * Determinate progress bar with an accessible value and a visible percentage,
 * so status is never communicated by color alone.
 */
export function ProgressBar({ value, max = 100, label, tone = 'accent', className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, max))
  // The visible percentage is not capped, so "over budget" can read 130%.
  const percent = max > 0 ? Math.round((value / max) * 100) : 0
  const widthPercent = Math.max(0, Math.min(percent, 100))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={`${percent}%`}
        className="h-2 flex-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-200', tone === 'danger' ? 'bg-danger' : 'bg-accent')}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-muted">{percent}%</span>
    </div>
  )
}
