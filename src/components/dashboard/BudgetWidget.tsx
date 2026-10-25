import { TriangleAlert } from 'lucide-react'
import type { BudgetSummary } from '../../lib/derive'
import { formatPHP } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'

interface BudgetWidgetProps {
  summary: BudgetSummary
  now: Date
  className?: string
}

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className={cn('mt-1 text-[13px] font-semibold tabular-nums leading-tight', className ?? 'text-ink')}>
        {value}
      </p>
    </div>
  )
}

/** Income, expenses, and remaining budget for the current month. */
export default function BudgetWidget({ summary, now, className }: BudgetWidgetProps) {
  const monthLabel = new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
  }).format(now)

  return (
    <Card className={className}>
      <CardHeader title="Monthly budget" subtitle={monthLabel} />
      <CardBody>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Income" value={formatPHP(summary.income)} className="text-success" />
          <Stat label="Expenses" value={formatPHP(summary.expense)} />
          <Stat
            label={summary.overBudget ? 'Over budget' : 'Remaining'}
            value={formatPHP(summary.remaining)}
            className={summary.overBudget ? 'text-danger' : 'text-ink'}
          />
        </div>

        <ProgressBar
          value={summary.expense}
          max={summary.budget}
          label="Monthly budget usage"
          tone={summary.overBudget ? 'danger' : 'accent'}
          className="mt-4"
        />

        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          {summary.overBudget ? (
            <TriangleAlert className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
          ) : null}
          {formatPHP(summary.expense)} of {formatPHP(summary.budget)} spent
          {summary.overBudget ? ' — over budget' : ''}
        </p>
      </CardBody>
    </Card>
  )
}
