import { describe, expect, it } from 'vitest'
import type { Habit, HabitCompletion } from '../types'
import {
  completionDocId,
  habitOverview,
  habitStreak,
  monthlyRate,
  normalizeHabitValues,
  recentDays,
  validateHabitForm,
  weeklyProgress,
} from './habit'

const NOW = new Date(2026, 9, 24, 12) // Saturday, 24 October 2026
// Week under test: Monday 19 → Sunday 25 October 2026.
const USER = 'user-1'

function habit(overrides: Partial<Habit> & Pick<Habit, 'id'>): Habit {
  return {
    userId: USER,
    name: 'Drink water',
    frequency: 'daily',
    targetPerPeriod: 1,
    archived: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function completion(habitId: string, completedOn: string): HabitCompletion {
  return {
    id: `${habitId}_${completedOn}`,
    userId: USER,
    habitId,
    completedOn,
    createdAt: `${completedOn}T08:00:00.000Z`,
  }
}

describe('completionDocId', () => {
  it('is deterministic per habit and day (duplicate-proof by construction)', () => {
    expect(completionDocId('h1', '2026-10-24')).toBe('h1_2026-10-24')
    expect(completionDocId('h1', '2026-10-24')).toBe(completionDocId('h1', '2026-10-24'))
    expect(completionDocId('h1', '2026-10-24')).not.toBe(completionDocId('h1', '2026-10-25'))
    expect(completionDocId('h1', '2026-10-24')).not.toBe(completionDocId('h2', '2026-10-24'))
  })
})

describe('habitStreak — daily', () => {
  const daily = habit({ id: 'h1' })

  it('counts consecutive days back from today', () => {
    const completions = ['2026-10-22', '2026-10-23', '2026-10-24'].map((d) =>
      completion('h1', d),
    )
    expect(habitStreak(daily, completions, NOW)).toEqual({ current: 3, longest: 3 })
  })

  it('keeps the streak alive while today is still pending', () => {
    const completions = ['2026-10-22', '2026-10-23'].map((d) => completion('h1', d))
    expect(habitStreak(daily, completions, NOW).current).toBe(2)
  })

  it('breaks the current streak on a gap but keeps the longest run', () => {
    // Done on 20–21, skipped 22, done 23; today (24) still pending.
    const completions = ['2026-10-20', '2026-10-21', '2026-10-23'].map((d) =>
      completion('h1', d),
    )
    expect(habitStreak(daily, completions, NOW)).toEqual({ current: 1, longest: 2 })
  })

  it('is zero with no completions', () => {
    expect(habitStreak(daily, [], NOW)).toEqual({ current: 0, longest: 0 })
  })

  it('ignores future-dated completions', () => {
    const completions = ['2026-10-24', '2026-10-26'].map((d) => completion('h1', d))
    expect(habitStreak(daily, completions, NOW)).toEqual({ current: 1, longest: 1 })
  })
})

describe('habitStreak — weekly', () => {
  const weekly = habit({ id: 'h2', frequency: 'weekly', targetPerPeriod: 2 })

  it('counts consecutive weeks meeting the target', () => {
    // Week of Oct 12: two completions ✓; week of Oct 19: two ✓.
    const completions = ['2026-10-12', '2026-10-14', '2026-10-20', '2026-10-22'].map((d) =>
      completion('h2', d),
    )
    expect(habitStreak(weekly, completions, NOW)).toEqual({ current: 2, longest: 2 })
  })

  it('grants grace for the in-progress week', () => {
    // Only one completion this week so far (target 2) — streak survives via
    // the previous week, which was completed.
    const completions = ['2026-10-12', '2026-10-14', '2026-10-20'].map((d) =>
      completion('h2', d),
    )
    expect(habitStreak(weekly, completions, NOW).current).toBe(1)
  })

  it('breaks when a full week missed the target', () => {
    const completions = [
      '2026-09-28',
      '2026-09-30', // week of Sep 28 ✓ (2/2)
      '2026-10-05', // week of Oct 5 ✗ (1/2)
      '2026-10-12',
      '2026-10-14', // week of Oct 12 ✓
      '2026-10-20',
      '2026-10-22', // week of Oct 19 ✓
    ].map((d) => completion('h2', d))
    expect(habitStreak(weekly, completions, NOW)).toEqual({ current: 2, longest: 2 })
  })
})

describe('weeklyProgress', () => {
  it('daily habit: days done vs. days elapsed (Mon→Sat = 6)', () => {
    const daily = habit({ id: 'h1' })
    const completions = ['2026-10-19', '2026-10-20', '2026-10-21'].map((d) =>
      completion('h1', d),
    )
    expect(weeklyProgress(daily, completions, NOW)).toEqual({
      done: 3,
      target: 6,
      complete: false,
    })
  })

  it('daily habit: complete when every elapsed day is done', () => {
    const daily = habit({ id: 'h1' })
    const completions = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'].map(
      (d) => completion('h1', d),
    )
    expect(weeklyProgress(daily, completions, NOW).complete).toBe(true)
  })

  it('weekly habit: completions vs. target, ignoring days outside the week', () => {
    const weekly = habit({ id: 'h2', frequency: 'weekly', targetPerPeriod: 3 })
    const completions = [
      '2026-10-14', // last week — must not count
      '2026-10-20',
      '2026-10-22',
      '2026-10-24',
    ].map((d) => completion('h2', d))
    expect(weeklyProgress(weekly, completions, NOW)).toEqual({
      done: 3,
      target: 3,
      complete: true,
    })
  })
})

describe('monthlyRate', () => {
  it('daily: done ÷ days elapsed in October (24), capped at 100', () => {
    const daily = habit({ id: 'h1' })
    const completions = Array.from({ length: 12 }, (_, index) =>
      completion('h1', `2026-10-${String(index + 1).padStart(2, '0')}`),
    )
    // 12 of the first 24 days = 50%; September and future dates don't count.
    expect(monthlyRate(daily, completions, NOW)).toBe(50)
    expect(monthlyRate(daily, [...completions, completion('h1', '2026-09-15')], NOW)).toBe(50)
    expect(monthlyRate(daily, [...completions, completion('h1', '2026-10-28')], NOW)).toBe(50)
  })

  it('weekly: done ÷ (weeks elapsed × target)', () => {
    const weekly = habit({ id: 'h2', frequency: 'weekly', targetPerPeriod: 2 })
    // October day 24 → ceil(24/7) = 4 weeks → possible 8; 4 done = 50%.
    const completions = ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'].map((d) =>
      completion('h2', d),
    )
    expect(monthlyRate(weekly, completions, NOW)).toBe(50)
  })
})

describe('recentDays', () => {
  it('returns the last N days, oldest first, ending today', () => {
    const days = recentDays(NOW, 14)
    expect(days).toHaveLength(14)
    expect(days[13]).toBe('2026-10-24')
    expect(days[0]).toBe('2026-10-11')
  })
})

describe('habitOverview', () => {
  it('assembles today flag, streak, week progress, month rate, and history', () => {
    const rows = habitOverview(
      [habit({ id: 'h1' })],
      ['2026-10-23', '2026-10-24'].map((d) => completion('h1', d)),
      NOW,
    )
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.completedToday).toBe(true)
    expect(row.streak.current).toBe(2)
    expect(row.week.done).toBe(2)
    expect(row.recent).toHaveLength(14)
    expect(row.recent[13]).toEqual({ iso: '2026-10-24', done: true })
    expect(row.recent[12]).toEqual({ iso: '2026-10-23', done: true })
    expect(row.recent[11]).toEqual({ iso: '2026-10-22', done: false })
    expect(row.monthRate).toBeGreaterThan(0)
  })
})

describe('habit form', () => {
  it('requires a name and caps it at 80 characters', () => {
    expect(validateHabitForm({ name: ' ', frequency: 'daily', targetPerPeriod: '1' }).name).toBeTruthy()
    expect(
      validateHabitForm({ name: 'x'.repeat(81), frequency: 'daily', targetPerPeriod: '1' }).name,
    ).toContain('80')
    expect(validateHabitForm({ name: 'Read', frequency: 'daily', targetPerPeriod: '1' })).toEqual({})
  })

  it('validates the weekly target between 1 and 7, but ignores it for daily habits', () => {
    expect(
      validateHabitForm({ name: 'Read', frequency: 'weekly', targetPerPeriod: '0' }).targetPerPeriod,
    ).toBeTruthy()
    expect(
      validateHabitForm({ name: 'Read', frequency: 'weekly', targetPerPeriod: '9' }).targetPerPeriod,
    ).toBeTruthy()
    expect(
      validateHabitForm({ name: 'Read', frequency: 'weekly', targetPerPeriod: '3' }).targetPerPeriod,
    ).toBeUndefined()
    expect(
      validateHabitForm({ name: 'Read', frequency: 'daily', targetPerPeriod: 'nonsense' })
        .targetPerPeriod,
    ).toBeUndefined()
  })

  it('normalizes: trims the name and forces daily targets to 1', () => {
    expect(
      normalizeHabitValues({ name: '  Read  ', frequency: 'daily', targetPerPeriod: 'nonsense' }),
    ).toEqual({ name: 'Read', frequency: 'daily', targetPerPeriod: 1 })
    expect(
      normalizeHabitValues({ name: 'Gym', frequency: 'weekly', targetPerPeriod: '3' }),
    ).toEqual({ name: 'Gym', frequency: 'weekly', targetPerPeriod: 3 })
  })
})
