import { describe, expect, it } from 'vitest'
import type {
  AcademicItem,
  Habit,
  HabitCompletion,
  MonthlyBudget,
  StudySession,
  Task,
  Transaction,
} from '../types'
import {
  budgetSummary,
  filterAndSortTasks,
  groupTasks,
  habitSummary,
  monthlyTotals,
  todayProgress,
  upcomingAcademicItems,
  weeklyHabitRate,
  weeklyStudy,
} from './derive'
import { toISODate } from './dates'

const NOW = new Date(2026, 9, 24, 12) // Saturday, 24 October 2026
const USER = 'user-1'

function task(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: 'A task',
    userId: USER,
    description: null,
    priority: 'medium',
    status: 'pending',
    dueDate: null,
    category: 'Personal',
    subjectId: null,
    academicItemId: null,
    completedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('groupTasks', () => {
  it('splits tasks into overdue, today, upcoming, and completed', () => {
    const tasks = [
      task({ id: 't1', title: 'Late', dueDate: '2026-10-22' }),
      task({ id: 't2', title: 'Due now', dueDate: '2026-10-24' }),
      task({ id: 't3', title: 'Later', dueDate: '2026-10-26' }),
      task({ id: 't4', title: 'Whenever', dueDate: null }),
      task({
        id: 't5',
        title: 'Done',
        status: 'completed',
        dueDate: '2026-10-24',
        completedAt: '2026-10-24T08:00:00.000Z',
      }),
    ]

    const groups = groupTasks(tasks, NOW)

    expect(groups.overdue.map((t) => t.id)).toEqual(['t1'])
    expect(groups.today.map((t) => t.id)).toEqual(['t2'])
    expect(groups.upcoming.map((t) => t.id)).toEqual(['t3', 't4'])
    expect(groups.completed.map((t) => t.id)).toEqual(['t5'])
  })

  it('sorts each pending group by due date, undated last', () => {
    const groups = groupTasks(
      [
        task({ id: 'a', title: 'A', dueDate: '2026-11-10' }),
        task({ id: 'b', title: 'B', dueDate: '2026-10-28' }),
        task({ id: 'c', title: 'C', dueDate: null }),
      ],
      NOW,
    )

    expect(groups.upcoming.map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('todayProgress', () => {
  it('counts everything due on or before today, completed or not', () => {
    const tasks = [
      task({ id: 't1', dueDate: '2026-10-22' }), // overdue, pending
      task({ id: 't2', dueDate: '2026-10-24' }), // due today, pending
      task({
        id: 't3',
        dueDate: '2026-10-24',
        status: 'completed',
        completedAt: '2026-10-24T09:00:00.000Z',
      }), // due today, done
      task({ id: 't4', dueDate: '2026-10-30' }), // future — excluded
      task({ id: 't5', dueDate: null }), // no date — excluded
    ]

    expect(todayProgress(tasks, NOW)).toEqual({ total: 3, completed: 1 })
    expect(todayProgress([], NOW)).toEqual({ total: 0, completed: 0 })
  })
})

describe('weeklyStudy', () => {
  function session(overrides: Partial<StudySession> & Pick<StudySession, 'id'>): StudySession {
    return {
      userId: USER,
      subjectId: null,
      projectId: null,
      startedAt: new Date(2026, 9, 19, 9).toISOString(),
      endedAt: new Date(2026, 9, 19, 10).toISOString(),
      pausedSeconds: 0,
      durationSeconds: 3600,
      status: 'completed',
      note: '',
      ...overrides,
    }
  }

  it('buckets sessions Monday→Sunday and drops other weeks and cancelled runs', () => {
    const sessions = [
      session({ id: 's1', startedAt: new Date(2026, 9, 19, 9).toISOString(), durationSeconds: 3600 }), // Mon 60m
      session({ id: 's2', startedAt: new Date(2026, 9, 21, 14).toISOString(), durationSeconds: 1800 }), // Wed 30m
      session({ id: 's3', startedAt: new Date(2026, 9, 18, 9).toISOString(), durationSeconds: 5400 }), // Sun — last week
      session({
        id: 's4',
        startedAt: new Date(2026, 9, 22, 9).toISOString(),
        status: 'cancelled',
        durationSeconds: 600,
      }), // cancelled — ignored
    ]

    const days = weeklyStudy(sessions, NOW)

    expect(days).toHaveLength(7)
    expect(days.map((d) => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(days.map((d) => d.minutes)).toEqual([60, 0, 30, 0, 0, 0, 0])
    expect(toISODate(new Date(`${days[0].isoDate}T00:00:00`))).toBe('2026-10-19')
  })
})

describe('monthlyTotals / budgetSummary', () => {
  function tx(
    overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'transactionOn'>,
  ): Transaction {
    return {
      userId: USER,
      category: 'Other',
      description: '',
      createdAt: '2026-10-01T00:00:00.000Z',
      ...overrides,
    }
  }

  const budget: MonthlyBudget = {
    id: 'b1',
    userId: USER,
    month: '2026-10-01',
    amount: 8000,
  }

  it('sums only the current calendar month', () => {
    const totals = monthlyTotals(
      [
        tx({ id: 'x1', type: 'income', amount: 5000, transactionOn: '2026-10-01' }),
        tx({ id: 'x2', type: 'expense', amount: 1500, transactionOn: '2026-10-15' }),
        tx({ id: 'x3', type: 'expense', amount: 200, transactionOn: '2026-09-30' }), // September
        tx({ id: 'x4', type: 'income', amount: 100, transactionOn: '2026-11-01' }), // November
      ],
      NOW,
    )

    expect(totals).toEqual({ income: 5000, expense: 1500, balance: 3500 })
  })

  it('reports remaining budget, percent used, and over-budget state', () => {
    const under = budgetSummary(
      [tx({ id: 'x1', type: 'expense', amount: 4000, transactionOn: '2026-10-10' })],
      budget,
      NOW,
    )
    expect(under.remaining).toEqual(4000)
    expect(under.percentUsed).toEqual(50)
    expect(under.overBudget).toBe(false)

    const over = budgetSummary(
      [tx({ id: 'x2', type: 'expense', amount: 9000, transactionOn: '2026-10-10' })],
      budget,
      NOW,
    )
    expect(over.remaining).toEqual(-1000)
    expect(over.percentUsed).toEqual(113)
    expect(over.overBudget).toBe(true)
  })
})

describe('habitSummary / weeklyHabitRate', () => {
  function habit(overrides: Partial<Habit> & Pick<Habit, 'id' | 'name'>): Habit {
    return {
      userId: USER,
      frequency: 'daily',
      targetPerPeriod: 1,
      archived: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      ...overrides,
    }
  }

  function completion(
    overrides: Partial<HabitCompletion> & Pick<HabitCompletion, 'id' | 'habitId' | 'completedOn'>,
  ): HabitCompletion {
    return { userId: USER, createdAt: '2026-10-01T00:00:00.000Z', ...overrides }
  }

  const habits = [
    habit({ id: 'h1', name: 'Water' }),
    habit({ id: 'h2', name: 'Read' }),
    habit({ id: 'h3', name: 'Archived habit', archived: true }),
    habit({ id: 'h4', name: 'Plan the week', frequency: 'weekly' }),
  ]

  it('summarizes today, skipping archived habits', () => {
    const summary = habitSummary(
      habits,
      [completion({ id: 'c1', habitId: 'h1', completedOn: '2026-10-24' })],
      NOW,
    )

    expect(summary.total).toBe(3) // h1, h2, h4 — not the archived one
    expect(summary.completedToday).toBe(1)
    expect(summary.items.find((item) => item.habit.id === 'h1')?.completedToday).toBe(true)
    expect(summary.items.find((item) => item.habit.id === 'h2')?.completedToday).toBe(false)
  })

  it('computes the weekly completion rate for daily habits', () => {
    // Week of Mon 19 Oct; "now" is Saturday 24 Oct → 6 days elapsed.
    const now = new Date(2026, 9, 24, 12)
    const completions = [
      completion({ id: 'c1', habitId: 'h1', completedOn: '2026-10-19' }),
      completion({ id: 'c2', habitId: 'h1', completedOn: '2026-10-20' }),
      completion({ id: 'c3', habitId: 'h2', completedOn: '2026-10-21' }),
      completion({ id: 'c4', habitId: 'h1', completedOn: '2026-10-18' }), // last week — ignored
      completion({ id: 'c5', habitId: 'h4', completedOn: '2026-10-19' }), // weekly habit — ignored here
    ]

    // 3 completions / (2 daily habits × 6 elapsed days) = 25%.
    expect(weeklyHabitRate(habits, completions, now)).toBe(25)
  })
})

describe('filterAndSortTasks', () => {
  const tasks = [
    task({ id: 'a', title: 'Overdue high', dueDate: '2026-10-20', priority: 'high', category: 'Academic', createdAt: '2026-10-02T00:00:00.000Z' }),
    task({ id: 'b', title: 'Today medium', dueDate: '2026-10-24', priority: 'medium', category: 'Personal', createdAt: '2026-10-03T00:00:00.000Z' }),
    task({ id: 'c', title: 'Future low chore', dueDate: '2026-11-01', priority: 'low', category: 'Personal', createdAt: '2026-10-01T00:00:00.000Z' }),
    task({ id: 'd', title: 'Done task', dueDate: '2026-10-22', status: 'completed', completedAt: '2026-10-22T10:00:00.000Z', category: 'Work', createdAt: '2026-10-04T00:00:00.000Z' }),
    task({ id: 'e', title: 'Undated idea', dueDate: null, priority: 'low', category: 'Work', createdAt: '2026-10-05T00:00:00.000Z' }),
  ]

  function run(overrides: Partial<Parameters<typeof filterAndSortTasks>[1]> = {}) {
    return filterAndSortTasks(tasks, {
      view: 'all',
      search: '',
      category: 'all',
      sort: 'dueDate',
      now: NOW,
      ...overrides,
    })
  }

  it('groups by view', () => {
    expect(run({ view: 'overdue' }).map((t) => t.id)).toEqual(['a'])
    expect(run({ view: 'today' }).map((t) => t.id)).toEqual(['b'])
    expect(run({ view: 'completed' }).map((t) => t.id)).toEqual(['d'])
    expect(run({ view: 'upcoming' }).map((t) => t.id)).toEqual(['c', 'e'])
    expect(run()).toHaveLength(5)
  })

  it('searches title and description, case-insensitively', () => {
    expect(run({ search: 'CHORE' }).map((t) => t.id)).toEqual(['c'])
    const withDescription = task({ id: 'f', title: 'Plain', description: 'mentions Firestore' })
    const found = filterAndSortTasks([...tasks, withDescription], {
      view: 'all', search: 'firestore', category: 'all', sort: 'dueDate', now: NOW,
    })
    expect(found.map((t) => t.id)).toEqual(['f'])
  })

  it('filters by category', () => {
    expect(run({ category: 'Work' }).map((t) => t.id).sort()).toEqual(['d', 'e'])
  })

  it('sorts by due date with undated tasks last', () => {
    expect(run({ view: 'all' }).map((t) => t.id)).toEqual(['a', 'd', 'b', 'c', 'e'])
  })

  it('sorts by priority (high first), then due date', () => {
    const order = run({ sort: 'priority', view: 'all' }).map((t) => t.id)
    expect(order[0]).toBe('a') // high
    expect(order[order.length - 1]).toBe('e') // low / undated
  })

  it('sorts by creation date, newest first', () => {
    expect(run({ sort: 'createdAt' }).map((t) => t.id)).toEqual(['e', 'd', 'b', 'a', 'c'])
  })
})

describe('upcomingAcademicItems', () => {
  function item(
    overrides: Partial<AcademicItem> & Pick<AcademicItem, 'id' | 'title' | 'kind'>,
  ): AcademicItem {
    return {
      userId: USER,
      subjectId: null,
      projectId: null,
      description: '',
      dueDate: null,
      priority: 'medium',
      status: 'not_started',
      progress: 0,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('returns open, dated items sorted by due date and respects the limit', () => {
    const items = [
      item({ id: 'i1', title: 'Later', kind: 'assignment', dueDate: '2026-11-20' }),
      item({ id: 'i2', title: 'Sooner', kind: 'exam', dueDate: '2026-10-26' }),
      item({ id: 'i3', title: 'Done', kind: 'exam', dueDate: '2026-10-25', status: 'completed' }),
      item({ id: 'i4', title: 'Undated', kind: 'milestone', dueDate: null }),
      item({ id: 'i5', title: 'Overdue', kind: 'assignment', dueDate: '2026-10-22' }),
    ]

    const result = upcomingAcademicItems(items, 3)

    expect(result.map((i) => i.id)).toEqual(['i5', 'i2', 'i1'])
  })
})
