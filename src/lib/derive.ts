import type {
  AcademicItem,
  Habit,
  HabitCompletion,
  MonthlyBudget,
  Priority,
  StudySession,
  Task,
  Transaction,
} from '../types'
import { daysBetween, isSameDay, parseISODate, startOfDay, startOfWeek, toISODate } from './dates'
import { sumByType } from './finance'

/**
 * Pure functions that turn raw records into what the dashboard shows.
 *
 * Keeping these separate from components means the logic is unit-testable
 * and the widgets stay presentational.
 */

export interface TaskGroups {
  /** Pending tasks whose due date is before today. */
  overdue: Task[]
  /** Pending tasks due today. */
  today: Task[]
  /** Pending tasks due later, or with no due date. */
  upcoming: Task[]
  /** All completed tasks. */
  completed: Task[]
}

export function groupTasks(tasks: Task[], now: Date): TaskGroups {
  const today = startOfDay(now)
  const groups: TaskGroups = { overdue: [], today: [], upcoming: [], completed: [] }

  for (const task of tasks) {
    if (task.status === 'completed') {
      groups.completed.push(task)
      continue
    }
    if (!task.dueDate) {
      groups.upcoming.push(task)
      continue
    }
    const due = parseISODate(task.dueDate)
    if (isSameDay(due, today)) groups.today.push(task)
    else if (due.getTime() < today.getTime()) groups.overdue.push(task)
    else groups.upcoming.push(task)
  }

  const byDueDate = (a: Task, b: Task): number =>
    (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')

  groups.today.sort(byDueDate)
  groups.upcoming.sort(byDueDate)
  groups.overdue.sort(byDueDate)
  return groups
}

/** Tasks that need attention today: overdue first, then due today. */
export function tasksNeedingAttention(tasks: Task[], now: Date): Task[] {
  const groups = groupTasks(tasks, now)
  return [...groups.overdue, ...groups.today]
}

export interface DayStudy {
  /** `YYYY-MM-DD` of the day. */
  isoDate: string
  /** Short weekday label, e.g. "Mon". */
  label: string
  minutes: number
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/**
 * Study minutes for each day of the week containing `now`
 * (Monday → Sunday). Sessions are bucketed by their local start day.
 */
export function weeklyStudy(sessions: StudySession[], now: Date): DayStudy[] {
  const weekStart = startOfWeek(now)
  const days: DayStudy[] = WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return { isoDate: toISODate(date), label, minutes: 0 }
  })

  for (const session of sessions) {
    if (session.status === 'cancelled') continue
    const started = startOfDay(new Date(session.startedAt))
    const bucket = days.find((day) => day.isoDate === toISODate(started))
    if (bucket) bucket.minutes += Math.round(session.durationSeconds / 60)
  }

  return days
}

export function totalMinutes(days: DayStudy[]): number {
  return days.reduce((sum, day) => sum + day.minutes, 0)
}

export interface MonthTotals {
  income: number
  expense: number
  balance: number
}

/** Income/expense totals for the calendar month containing `now`. */
export function monthlyTotals(transactions: Transaction[], now: Date): MonthTotals {
  const year = now.getFullYear()
  const month = now.getMonth()
  const inMonth = transactions.filter((tx) => {
    const date = parseISODate(tx.transactionOn)
    return date.getFullYear() === year && date.getMonth() === month
  })

  // Same income/expense summation the expense tracker uses (lib/finance).
  const totals = sumByType(inMonth)
  return { ...totals, balance: totals.income - totals.expense }
}

export interface BudgetSummary extends MonthTotals {
  budget: number
  remaining: number
  percentUsed: number
  overBudget: boolean
}

export function budgetSummary(
  transactions: Transaction[],
  budget: MonthlyBudget,
  now: Date,
): BudgetSummary {
  const totals = monthlyTotals(transactions, now)
  const remaining = budget.amount - totals.expense
  const percentUsed =
    budget.amount > 0 ? Math.round((totals.expense / budget.amount) * 100) : 0
  return {
    ...totals,
    budget: budget.amount,
    remaining,
    percentUsed,
    overBudget: remaining < 0,
  }
}

/**
 * Progress across everything due on or before today (overdue counts too):
 * the number the dashboard's progress bar shows.
 */
export function todayProgress(
  tasks: Task[],
  now: Date,
): { total: number; completed: number } {
  const today = startOfDay(now)
  let total = 0
  let completed = 0

  for (const task of tasks) {
    if (!task.dueDate) continue
    if (parseISODate(task.dueDate).getTime() > today.getTime()) continue
    total += 1
    if (task.status === 'completed') completed += 1
  }

  return { total, completed }
}

/**
 * Completion rate for daily habits in the week so far (0–100).
 * Weekly habits are tracked in stage 4 and excluded here.
 */
export function weeklyHabitRate(
  habits: Habit[],
  completions: HabitCompletion[],
  now: Date,
): number {
  const daily = habits.filter((habit) => !habit.archived && habit.frequency === 'daily')
  if (daily.length === 0) return 0

  const weekStart = startOfWeek(now)
  const daysElapsed = daysBetween(weekStart, startOfDay(now)) + 1
  const dailyIds = new Set(daily.map((habit) => habit.id))
  const done = completions.filter(
    (completion) =>
      dailyIds.has(completion.habitId) &&
      parseISODate(completion.completedOn).getTime() >= weekStart.getTime() &&
      parseISODate(completion.completedOn).getTime() <= startOfDay(now).getTime(),
  ).length

  const possible = daily.length * daysElapsed
  return possible > 0 ? Math.round((Math.min(done, possible) / possible) * 100) : 0
}

export interface HabitSummaryItem {
  habit: Habit
  completedToday: boolean
}

export interface HabitSummary {
  items: HabitSummaryItem[]
  completedToday: number
  total: number
}

export function habitSummary(
  habits: Habit[],
  completions: HabitCompletion[],
  now: Date,
): HabitSummary {
  const today = toISODate(startOfDay(now))
  const active = habits.filter((habit) => !habit.archived)
  const completedIds = new Set(
    completions.filter((completion) => completion.completedOn === today).map((c) => c.habitId),
  )

  const items = active.map((habit) => ({
    habit,
    completedToday: completedIds.has(habit.id),
  }))

  return {
    items,
    completedToday: items.filter((item) => item.completedToday).length,
    total: items.length,
  }
}

/**
 * Open academic deadlines (assignments, exams, milestones) sorted by due date.
 * Overdue items come first, so the widget surfaces them naturally.
 */
export function upcomingAcademicItems(items: AcademicItem[], limit = 5): AcademicItem[] {
  return items
    .filter((item) => item.status !== 'completed' && item.dueDate !== null)
    .sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'))
    .slice(0, limit)
}

/** Which task list the user is viewing. */
export type TaskView = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'

/** Available sort orders for the task list. */
export type TaskSort = 'dueDate' | 'priority' | 'createdAt'

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

export interface TaskListOptions {
  view: TaskView
  search: string
  /** `'all'` disables the category filter. */
  category: string
  sort: TaskSort
  now: Date
}

/**
 * The task list's complete query: view grouping, text search, category
 * filter, and sorting — pure, so the page stays declarative and the
 * behavior is unit-tested.
 */
export function filterAndSortTasks(tasks: Task[], options: TaskListOptions): Task[] {
  const groups = groupTasks(tasks, options.now)
  let list: Task[] = tasks
  switch (options.view) {
    case 'today':
      list = groups.today
      break
    case 'upcoming':
      list = groups.upcoming
      break
    case 'overdue':
      list = groups.overdue
      break
    case 'completed':
      list = groups.completed
      break
    case 'all':
      break
  }

  const search = options.search.trim().toLowerCase()
  if (search) {
    list = list.filter(
      (task) =>
        task.title.toLowerCase().includes(search) ||
        (task.description ?? '').toLowerCase().includes(search),
    )
  }

  if (options.category !== 'all') {
    list = list.filter((task) => task.category === options.category)
  }

  const byId = (a: Task, b: Task): number => a.id.localeCompare(b.id)
  const byDueDate = (a: Task, b: Task): number =>
    (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || byId(a, b)

  const sorted = [...list]
  switch (options.sort) {
    case 'priority':
      sorted.sort(
        (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDueDate(a, b),
      )
      break
    case 'createdAt':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byId(a, b))
      break
    case 'dueDate':
      sorted.sort(byDueDate)
      break
  }
  return sorted
}
