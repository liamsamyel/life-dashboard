import { useMemo } from 'react'
import { Badge } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import BudgetWidget from '../components/dashboard/BudgetWidget'
import DeadlinesWidget from '../components/dashboard/DeadlinesWidget'
import HabitSummaryWidget from '../components/dashboard/HabitSummaryWidget'
import QuickActions from '../components/dashboard/QuickActions'
import QuickLinksWidget from '../components/dashboard/QuickLinksWidget'
import RecentNotesWidget from '../components/dashboard/RecentNotesWidget'
import StudyHoursWidget from '../components/dashboard/StudyHoursWidget'
import TodayTasksWidget from '../components/dashboard/TodayTasksWidget'
import {
  budgetSummary,
  groupTasks,
  habitSummary,
  todayProgress,
  upcomingAcademicItems,
  weeklyHabitRate,
  weeklyStudy,
} from '../lib/derive'
import { formatLongDate, greetingFor } from '../lib/format'
import { useDashboardData } from '../hooks/useDashboardData'
import type { DashboardData } from '../types'

/** Pure widget model — extracted so the component's hook order stays fixed. */
function buildModel(data: DashboardData, now: Date) {
  const groups = groupTasks(data.tasks, now)
  return {
    attentionTasks: [...groups.overdue, ...groups.today],
    progress: todayProgress(data.tasks, now),
    deadlines: upcomingAcademicItems(data.academicItems, 5),
    habits: habitSummary(data.habits, data.habitCompletions, now),
    weekRate: weeklyHabitRate(data.habits, data.habitCompletions, now),
    studyDays: weeklyStudy(data.studySessions, now),
    budget: budgetSummary(data.transactions, data.budget, now),
    notes: [...data.notes]
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
      )
      .slice(0, 4),
    bookmarks: [...data.bookmarks]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
  }
}

/**
 * Dashboard overview: greeting and date, quick actions, today's tasks,
 * upcoming deadlines, habit summary, weekly study hours, monthly budget,
 * recent notes, and quick links.
 *
 * All derived numbers come from `lib/derive` (unit-tested); this component
 * only composes widgets.
 */
export default function DashboardPage() {
  const { data, source, loading, error, reload } = useDashboardData()
  // Every hook runs before any early return: skipping hooks on the loading
  // render and running them once data arrives crashes React (hook order).
  const now = useMemo(() => new Date(), [])
  const model = useMemo(() => (data ? buildModel(data, now) : null), [data, now])

  if (loading) {
    return <LoadingState label="Loading your data…" />
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />
  }

  if (!data || !model) {
    return <ErrorState message="No data to show." onRetry={reload} />
  }

  const firstName = data.profile.displayName.trim().split(' ')[0] || 'there'

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {greetingFor(now, data.profile.timeZone)}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatLongDate(now, data.profile.dateFormat, data.profile.timeZone)}
        </p>
      </header>

      {source === 'sample' ? (
        <div className="mb-5">
          <Badge tone="accent">Sample data</Badge>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            These are development sample records, kept separate from real user data. Connect
            Firebase (stage 6) to work with your own.
          </p>
        </div>
      ) : null}

      <div className="mb-6">
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <TodayTasksWidget
          className="md:col-span-1 xl:col-span-7"
          tasks={model.attentionTasks}
          progress={model.progress}
          now={now}
        />
        <DeadlinesWidget
          className="md:col-span-1 xl:col-span-5"
          items={model.deadlines}
          subjects={data.subjects}
          now={now}
        />
        <HabitSummaryWidget
          className="md:col-span-1 xl:col-span-4"
          summary={model.habits}
          weekRate={model.weekRate}
        />
        <StudyHoursWidget className="md:col-span-1 xl:col-span-4" days={model.studyDays} />
        <BudgetWidget className="md:col-span-1 xl:col-span-4" summary={model.budget} now={now} />
        <RecentNotesWidget className="md:col-span-1 xl:col-span-7" notes={model.notes} now={now} />
        <QuickLinksWidget className="md:col-span-1 xl:col-span-5" bookmarks={model.bookmarks} />
      </div>
    </div>
  )
}
