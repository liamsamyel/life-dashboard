import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AcademicItem, Subject } from '../../types'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DueDate } from '../ui/DueDate'

interface DeadlinesWidgetProps {
  items: AcademicItem[]
  subjects: Subject[]
  now: Date
  className?: string
}

const KIND_LABELS: Record<AcademicItem['kind'], string> = {
  assignment: 'Assignment',
  exam: 'Exam',
  milestone: 'Milestone',
}

/** Next academic deadlines, sorted by due date, with subject codes. */
export default function DeadlinesWidget({ items, subjects, now, className }: DeadlinesWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader
        title="Upcoming deadlines"
        subtitle="Assignments, exams, and milestones"
        action={
          <Link to="/planner" className="font-medium text-accent hover:underline">
            Planner
          </Link>
        }
      />
      <CardBody>
        {items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            No open deadlines. Enjoy the quiet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => {
              const subject = item.subjectId
                ? subjects.find((candidate) => candidate.id === item.subjectId)
                : undefined
              return (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge tone={item.kind === 'exam' ? 'accent' : 'neutral'}>
                        {KIND_LABELS[item.kind]}
                      </Badge>
                      {subject ? (
                        <span className="text-xs font-medium text-ink-muted">{subject.code}</span>
                      ) : null}
                      <DueDate due={item.dueDate} now={now} />
                      {item.progress > 0 && item.progress < 100 ? (
                        <span className="text-xs text-ink-muted">{item.progress}% done</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
