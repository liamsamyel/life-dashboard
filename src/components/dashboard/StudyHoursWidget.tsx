import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { totalMinutes, type DayStudy } from '../../lib/derive'
import { formatDuration } from '../../lib/format'
import { Card, CardBody, CardHeader } from '../ui/Card'

interface StudyHoursWidgetProps {
  /** Monday → Sunday minutes for the current week. */
  days: DayStudy[]
  /** Copy for the empty chart (the tracker page passes its own wording). */
  emptyHint?: string
  className?: string
}

/** Weekly study time as a simple bar chart, with an accessible summary of the same data. */
export default function StudyHoursWidget({ days, emptyHint, className }: StudyHoursWidgetProps) {
  const total = totalMinutes(days)
  const chartData = days.map((day) => ({
    label: day.label,
    hours: Math.round(day.minutes / 6) / 10, // minutes → hours, 1 decimal
  }))
  const summaryText = days.map((day) => `${day.label}: ${day.minutes} minutes`).join(', ')

  return (
    <Card className={className}>
      <CardHeader
        title="Study hours"
        subtitle={total > 0 ? `${formatDuration(total * 60)} this week` : 'No sessions this week'}
      />
      <CardBody>
        {total === 0 ? (
          <p className="text-sm text-ink-muted">
            {emptyHint ?? 'Start your first session in the Study Tracker to fill this chart.'}
          </p>
        ) : (
          <div role="img" aria-label={`Study time this week, Monday to Sunday. ${summaryText}.`} className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
                  width={44}
                  allowDecimals={false}
                  unit="h"
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--ink)',
                  }}
                  labelStyle={{ color: 'var(--ink-muted)' }}
                  formatter={(value) => [`${value} h`, 'Study time']}
                />
                <Bar dataKey="hours" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
