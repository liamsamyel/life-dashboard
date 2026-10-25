import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CategorySpend, MonthTrendPoint } from '../../lib/finance'
import { formatPHP } from '../../lib/format'
import { Card, CardBody, CardHeader } from '../ui/Card'

const AXIS_TICK = { fill: 'var(--ink-muted)', fontSize: 11 }

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--ink)',
}

interface CategoryBreakdownChartProps {
  rows: CategorySpend[]
  /** Month being shown, used in the card subtitle. */
  subtitle: string
  className?: string
}

/**
 * Where the month's money went: one solid bar per category, largest first.
 * The same numbers are spelled out in the accessible description, so the
 * chart is not the only way to read them.
 */
export function CategoryBreakdownChart({ rows, subtitle, className }: CategoryBreakdownChartProps) {
  const summary = rows
    .map((row) => `${row.category}: ${formatPHP(row.amount)} (${row.percent}%)`)
    .join(', ')

  return (
    <Card className={className}>
      <CardHeader title="Spending by category" subtitle={subtitle} />
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No expenses recorded for this month yet — add one to see the breakdown.
          </p>
        ) : (
          <>
            <div
              role="img"
              aria-label={`Spending by category: ${summary}.`}
              style={{ height: Math.max(160, rows.length * 34) }}
              className="w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--line)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TICK}
                    tickFormatter={(value) => `₱${Number(value).toLocaleString('en-PH')}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={104}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TICK}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: 'var(--ink-muted)' }}
                    formatter={(value) => [formatPHP(Number(value)), 'Spent']}
                  />
                  <Bar dataKey="amount" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-3 space-y-1">
              {rows.map((row) => (
                <li key={row.category} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-ink-muted">{row.category}</span>
                  <span className="shrink-0 tabular-nums text-ink">
                    {formatPHP(row.amount)}{' '}
                    <span className="text-ink-muted">· {row.percent}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  )
}

interface MonthlyTrendChartProps {
  points: MonthTrendPoint[]
  className?: string
}

/** Income versus expenses for the last six months. */
export function MonthlyTrendChart({ points, className }: MonthlyTrendChartProps) {
  const hasData = points.some((point) => point.income > 0 || point.expense > 0)
  const summary = points
    .map((point) => `${point.longLabel}: income ${formatPHP(point.income)}, expenses ${formatPHP(point.expense)}`)
    .join('; ')

  return (
    <Card className={className}>
      <CardHeader title="Monthly trend" subtitle="Income and expenses, last 6 months" />
      <CardBody>
        {!hasData ? (
          <p className="text-sm text-ink-muted">
            Nothing recorded in the last six months yet — the trend fills in as you add entries.
          </p>
        ) : (
          <div
            role="img"
            aria-label={`Monthly income and expenses. ${summary}.`}
            className="h-52 w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} interval={0} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS_TICK}
                  width={52}
                  tickFormatter={(value) => `₱${Number(value).toLocaleString('en-PH')}`}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: 'var(--ink-muted)' }}
                  formatter={(value) => formatPHP(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--ink-muted)' }} />
                <Bar dataKey="income" name="Income" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="expense" name="Expenses" fill="var(--danger)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
