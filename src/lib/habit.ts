import type { Habit, HabitCompletion, HabitFrequency } from '../types'
import { addDays, daysBetween, parseISODate, startOfDay, startOfWeek, toISODate } from './dates'

/**
 * Pure habit logic: duplicate-proof completion ids, streak calculation,
 * weekly/monthly completion statistics, and the create/edit form.
 *
 * Streak rules:
 *   * Daily — consecutive completed days counting back from today; if today
 *     isn't done yet but yesterday is, the streak survives (today pending).
 *   * Weekly — consecutive weeks where completions meet `targetPerPeriod`;
 *     the current week gets the same grace while it's still in progress.
 */

export const HABIT_NAME_MAX = 80

/**
 * Deterministic document id for a completion: one habit can have at most one
 * completion per day, because same-id writes converge instead of stacking
 * (Firestore has no UNIQUE constraint — see `firestore.rules`).
 */
export function completionDocId(habitId: string, completedOn: string): string {
  return `${habitId}_${completedOn}`
}

/** All completion dates for one habit. */
export function completionDates(
  completions: HabitCompletion[],
  habitId: string,
): Set<string> {
  const dates = new Set<string>()
  for (const completion of completions) {
    if (completion.habitId === habitId) dates.add(completion.completedOn)
  }
  return dates
}

// ---------------------------------------------------------------------------
// Habit form
// ---------------------------------------------------------------------------

export interface HabitFormValues {
  name: string
  frequency: HabitFrequency
  /** Whole number as typed; only meaningful for weekly habits. */
  targetPerPeriod: string
}

export type HabitFormErrors = Partial<Record<'name' | 'targetPerPeriod', string>>

export function emptyHabitValues(): HabitFormValues {
  return { name: '', frequency: 'daily', targetPerPeriod: '1' }
}

export function habitToFormValues(habit: Habit): HabitFormValues {
  return {
    name: habit.name,
    frequency: habit.frequency,
    targetPerPeriod: String(habit.targetPerPeriod),
  }
}

export function validateHabitForm(values: HabitFormValues): HabitFormErrors {
  const errors: HabitFormErrors = {}

  const name = values.name.trim()
  if (name.length === 0) {
    errors.name = 'Enter a name for the habit.'
  } else if (name.length > HABIT_NAME_MAX) {
    errors.name = `Keep the name to ${HABIT_NAME_MAX} characters or fewer.`
  }

  if (values.frequency === 'weekly') {
    const target = values.targetPerPeriod.trim()
    if (!/^\d+$/.test(target) || Number(target) < 1 || Number(target) > 7) {
      errors.targetPerPeriod = 'Enter a target from 1 to 7 times per week.'
    }
  }

  return errors
}

export function hasFormErrors(errors: HabitFormErrors): boolean {
  return Object.keys(errors).length > 0
}

export function normalizeHabitValues(values: HabitFormValues): {
  name: string
  frequency: HabitFrequency
  targetPerPeriod: number
} {
  return {
    name: values.name.trim(),
    frequency: values.frequency,
    // Daily habits are once per day; only weekly habits carry a real target.
    targetPerPeriod:
      values.frequency === 'daily' ? 1 : Number(values.targetPerPeriod.trim() || '1'),
  }
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

export interface Streak {
  current: number
  longest: number
}

/** Drop completions dated in the future (bad clock data shouldn't count). */
function onOrBefore(dates: Set<string>, now: Date): Set<string> {
  const today = toISODate(startOfDay(now))
  const filtered = new Set<string>()
  for (const iso of dates) {
    if (iso <= today) filtered.add(iso)
  }
  return filtered
}

function dailyStreak(dates: Set<string>, now: Date): Streak {
  // Current: start at today, or yesterday when today is still pending.
  let cursor = startOfDay(now)
  if (!dates.has(toISODate(cursor))) cursor = addDays(cursor, -1)
  let current = 0
  while (dates.has(toISODate(cursor))) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  // Longest run over all dates (sorted, consecutive-day runs).
  let longest = 0
  let run = 0
  let previous: string | null = null
  for (const iso of [...dates].sort()) {
    run = previous !== null && daysBetween(parseISODate(previous), parseISODate(iso)) === 1 ? run + 1 : 1
    if (run > longest) longest = run
    previous = iso
  }

  return { current, longest }
}

function weeklyStreak(dates: Set<string>, target: number, now: Date): Streak {
  const counts = new Map<string, number>()
  for (const iso of dates) {
    const week = toISODate(startOfWeek(parseISODate(iso)))
    counts.set(week, (counts.get(week) ?? 0) + 1)
  }
  const meets = (weekISO: string): boolean => (counts.get(weekISO) ?? 0) >= target

  // Current: grace for the in-progress week, then walk back week by week.
  let cursor = startOfWeek(now)
  if (!meets(toISODate(cursor))) cursor = addDays(cursor, -7)
  let current = 0
  while (meets(toISODate(cursor))) {
    current += 1
    cursor = addDays(cursor, -7)
  }

  // Longest: walk every week from the first completed week to this one.
  let longest = 0
  let run = 0
  const weekISOs = [...counts.keys()].sort()
  if (weekISOs.length > 0) {
    let walk = startOfWeek(parseISODate(weekISOs[0]))
    const last = startOfWeek(now)
    while (walk.getTime() <= last.getTime()) {
      if (meets(toISODate(walk))) {
        run += 1
        if (run > longest) longest = run
      } else {
        run = 0
      }
      walk = addDays(walk, 7)
    }
  }

  return { current, longest }
}

/** Current and longest streak for one habit at a fixed reference time. */
export function habitStreak(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date,
): Streak {
  const dates = onOrBefore(completionDates(completions, habit.id), now)
  return habit.frequency === 'daily'
    ? dailyStreak(dates, now)
    : weeklyStreak(dates, Math.max(1, habit.targetPerPeriod), now)
}

// ---------------------------------------------------------------------------
// Period statistics
// ---------------------------------------------------------------------------

export interface PeriodProgress {
  done: number
  target: number
  complete: boolean
}

/**
 * This week's progress for one habit (weeks start Monday):
 *   * daily  — days done vs. days elapsed so far (a perfect week so far),
 *   * weekly — completions vs. `targetPerPeriod`.
 */
export function weeklyProgress(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date,
): PeriodProgress {
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 6)
  const today = startOfDay(now)
  const inWeek = completions.filter((completion) => {
    if (completion.habitId !== habit.id) return false
    const date = parseISODate(completion.completedOn)
    return date.getTime() >= weekStart.getTime() && date.getTime() <= weekEnd.getTime()
  })

  if (habit.frequency === 'weekly') {
    const done = inWeek.filter(
      (completion) => parseISODate(completion.completedOn).getTime() <= today.getTime(),
    ).length
    const target = Math.max(1, habit.targetPerPeriod)
    return { done, target, complete: done >= target }
  }

  const daysElapsed = Math.min(7, daysBetween(weekStart, today) + 1)
  const done = Math.min(
    daysElapsed,
    inWeek.filter(
      (completion) => parseISODate(completion.completedOn).getTime() <= today.getTime(),
    ).length,
  )
  return { done, target: daysElapsed, complete: done >= daysElapsed }
}

/**
 * Completion rate for the current calendar month, 0–100, capped at the
 * opportunities that have actually elapsed (daily: days so far; weekly:
 * weeks so far × target).
 */
export function monthlyRate(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date,
): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = startOfDay(now)
  const done = completions.filter((completion) => {
    if (completion.habitId !== habit.id) return false
    const date = parseISODate(completion.completedOn)
    return date.getTime() >= monthStart.getTime() && date.getTime() <= today.getTime()
  }).length

  if (habit.frequency === 'daily') {
    const daysElapsed = today.getDate()
    return daysElapsed > 0 ? Math.min(100, Math.round((done / daysElapsed) * 100)) : 0
  }

  const weeksElapsed = Math.max(1, Math.ceil(today.getDate() / 7))
  const possible = weeksElapsed * Math.max(1, habit.targetPerPeriod)
  return Math.min(100, Math.round((done / possible) * 100))
}

/** The last `count` calendar days as ISO strings, oldest first, ending today. */
export function recentDays(now: Date, count: number): string[] {
  const today = startOfDay(now)
  return Array.from({ length: count }, (_, index) =>
    toISODate(addDays(today, index - count + 1)),
  )
}

// ---------------------------------------------------------------------------
// Overview (everything the habits page renders)
// ---------------------------------------------------------------------------

export interface HabitOverviewRow {
  habit: Habit
  completedToday: boolean
  streak: Streak
  week: PeriodProgress
  monthRate: number
  recent: Array<{ iso: string; done: boolean }>
}

/**
 * One row per habit with everything the page shows. The caller decides
 * which habits to pass (active vs. archived) — this stays pure.
 */
export function habitOverview(
  habits: Habit[],
  completions: HabitCompletion[],
  now: Date,
  historyDays = 14,
): HabitOverviewRow[] {
  const recent = recentDays(now, historyDays)
  return habits.map((habit) => {
    const dates = completionDates(completions, habit.id)
    return {
      habit,
      completedToday: dates.has(toISODate(startOfDay(now))),
      streak: habitStreak(habit, completions, now),
      week: weeklyProgress(habit, completions, now),
      monthRate: monthlyRate(habit, completions, now),
      recent: recent.map((iso) => ({ iso, done: dates.has(iso) })),
    }
  })
}
