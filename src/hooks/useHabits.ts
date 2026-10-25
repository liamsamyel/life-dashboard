import type { Habit, HabitCompletion } from '../types'
import {
  completionDocId,
  normalizeHabitValues,
  type HabitFormValues,
} from '../lib/habit'
import { useCollection } from './useCollection'

export interface UseHabitsResult {
  habits: Habit[]
  completions: HabitCompletion[]
  loading: boolean
  error: string | null
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  createHabit: (values: HabitFormValues) => Promise<void>
  updateHabit: (id: string, values: HabitFormValues) => Promise<void>
  setHabitArchived: (id: string, archived: boolean) => Promise<void>
  /** Deletes the habit and its completion history (no orphan records). */
  removeHabit: (id: string) => Promise<void>
  /** Mark/unmark a habit on a calendar date — duplicate-proof by id. */
  toggleCompletion: (habit: Habit, completedOn: string) => Promise<void>
}

/**
 * Habits and their completions, live from Firestore through `useCollection`.
 *
 * Duplicate protection: completions are written with the deterministic id
 * `${habitId}_${YYYY-MM-DD}` (see `lib/habit.completionDocId`), so a habit
 * can be marked at most once per day no matter how fast the button is
 * double-clicked — toggling off deletes that exact document.
 */
export function useHabits(): UseHabitsResult {
  const habitsCollection = useCollection<Habit>('habits')
  const completionsCollection = useCollection<HabitCompletion>('habitCompletions')

  async function createHabit(values: HabitFormValues): Promise<void> {
    await habitsCollection.create({ ...normalizeHabitValues(values), archived: false })
  }

  async function updateHabit(id: string, values: HabitFormValues): Promise<void> {
    await habitsCollection.update(id, normalizeHabitValues(values))
  }

  async function setHabitArchived(id: string, archived: boolean): Promise<void> {
    await habitsCollection.update(id, { archived })
  }

  async function removeHabit(id: string): Promise<void> {
    const linked = completionsCollection.rows.filter((completion) => completion.habitId === id)
    await Promise.all(
      linked.map((completion) => completionsCollection.remove(completion.id)),
    )
    await habitsCollection.remove(id)
  }

  async function toggleCompletion(habit: Habit, completedOn: string): Promise<void> {
    const existing = completionsCollection.rows.find(
      (completion) => completion.habitId === habit.id && completion.completedOn === completedOn,
    )
    if (existing) {
      await completionsCollection.remove(existing.id)
      return
    }
    await completionsCollection.set(completionDocId(habit.id, completedOn), {
      habitId: habit.id,
      completedOn,
    })
  }

  return {
    habits: habitsCollection.rows,
    completions: completionsCollection.rows,
    loading: habitsCollection.loading || completionsCollection.loading,
    error: habitsCollection.error ?? completionsCollection.error,
    readOnly: habitsCollection.readOnly,
    source: habitsCollection.source,
    reload: () => {
      habitsCollection.reload()
      completionsCollection.reload()
    },
    createHabit,
    updateHabit,
    setHabitArchived,
    removeHabit,
    toggleCompletion,
  }
}
