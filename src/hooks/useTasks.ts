import type { Task } from '../types'
import { emptyTaskValues, normalizeTaskValues, type TaskFormValues } from '../lib/taskForm'
import { useCollection } from './useCollection'

export interface UseTasksResult {
  tasks: Task[]
  loading: boolean
  error: string | null
  /** Sample-data mode: readable, but writes are unavailable. */
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  createTask: (values: TaskFormValues) => Promise<void>
  updateTask: (id: string, values: TaskFormValues) => Promise<void>
  setTaskCompleted: (id: string, completed: boolean) => Promise<void>
  removeTask: (id: string) => Promise<void>
}

/**
 * The user's tasks — the generic live subscription comes from
 * `useCollection`; this hook only adds the task-domain write logic (form
 * normalization and the completed-at timestamp). `onSnapshot` streams
 * changes, so a create/edit/complete anywhere shows up instantly without a
 * refetch.
 */
export function useTasks(): UseTasksResult {
  const { rows, loading, error, readOnly, source, reload, create, update, remove } =
    useCollection<Task>('tasks')

  async function createTask(values: TaskFormValues): Promise<void> {
    const normalized = normalizeTaskValues({ ...emptyTaskValues(), ...values })
    await create({ ...normalized, status: 'pending', completedAt: null })
  }

  async function updateTask(id: string, values: TaskFormValues): Promise<void> {
    await update(id, normalizeTaskValues(values))
  }

  async function setTaskCompleted(id: string, completed: boolean): Promise<void> {
    await update(id, {
      status: completed ? 'completed' : 'pending',
      completedAt: completed ? new Date().toISOString() : null,
    })
  }

  async function removeTask(id: string): Promise<void> {
    await remove(id)
  }

  return {
    tasks: rows,
    loading,
    error,
    readOnly,
    source,
    reload,
    createTask,
    updateTask,
    setTaskCompleted,
    removeTask,
  }
}
