import type { Priority, Task } from '../types'
import { isValidISODate } from './dates'

/** Values handled by the task create/edit form (strings straight from inputs). */
export interface TaskFormValues {
  title: string
  description: string
  priority: Priority
  /** `YYYY-MM-DD` or '' when the task has no due date. */
  dueDate: string
  category: string
}

export type TaskFormErrors = Partial<Record<'title' | 'dueDate' | 'category', string>>

export const TASK_TITLE_MAX = 160
export const TASK_CATEGORY_MAX = 60

/** Form state for a brand-new task. */
export function emptyTaskValues(): TaskFormValues {
  return { title: '', description: '', priority: 'medium', dueDate: '', category: '' }
}

/** Form state pre-filled from an existing task (for editing). */
export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueDate: task.dueDate ?? '',
    category: task.category,
  }
}

/**
 * Validate the task form. Returns an empty object when the values are
 * acceptable; each message is shown under its field.
 */
export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {}

  const title = values.title.trim()
  if (title.length === 0) {
    errors.title = 'Enter a title for the task.'
  } else if (title.length > TASK_TITLE_MAX) {
    errors.title = `Keep the title to ${TASK_TITLE_MAX} characters or fewer.`
  }

  if (values.dueDate !== '' && !isValidISODate(values.dueDate)) {
    errors.dueDate = 'Enter a valid due date.'
  }

  if (values.category.trim().length > TASK_CATEGORY_MAX) {
    errors.category = `Keep the category to ${TASK_CATEGORY_MAX} characters or fewer.`
  }

  return errors
}

export function hasFormErrors(errors: TaskFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Persist-ready values: trimmed, with a default category when left blank. */
export function normalizeTaskValues(values: TaskFormValues): {
  title: string
  description: string
  priority: Priority
  dueDate: string | null
  category: string
} {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    priority: values.priority,
    dueDate: values.dueDate === '' ? null : values.dueDate,
    category: values.category.trim() || 'General',
  }
}
