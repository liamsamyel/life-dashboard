import { useEffect, useId, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { cn } from '../../lib/cn'
import {
  hasFormErrors,
  taskToFormValues,
  validateTaskForm,
  emptyTaskValues,
  type TaskFormErrors,
  type TaskFormValues,
} from '../../lib/taskForm'
import type { Priority, Task } from '../../types'

interface TaskFormDialogProps {
  open: boolean
  /** Existing task to edit, or null to create. */
  task: Task | null
  /** Existing categories, offered as autocomplete suggestions. */
  categories: string[]
  onSubmit: (values: TaskFormValues) => Promise<void>
  onClose: () => void
}

const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

/** Create/edit form. Validates before submit; shows submit errors inline. */
export function TaskFormDialog({ open, task, categories, onSubmit, onClose }: TaskFormDialogProps) {
  const datalistId = useId()
  const [values, setValues] = useState<TaskFormValues>(emptyTaskValues)
  const [errors, setErrors] = useState<TaskFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset whenever the dialog opens, pre-filling from the task being edited.
  useEffect(() => {
    if (!open) return
    setValues(task ? taskToFormValues(task) : emptyTaskValues())
    setErrors({})
    setSubmitError(null)
    setSubmitting(false)
  }, [open, task])

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const nextErrors = validateTaskForm(values)
    setErrors(nextErrors)
    if (hasFormErrors(nextErrors)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the task.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={submitting}
      title={task ? 'Edit task' : 'New task'}
      description={
        task ? 'Changes save to your Firestore document.' : 'Add a task to your list.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-form"
            variant="primary"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : task ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Title"
          value={values.title}
          onChange={(event) => set('title', event.target.value)}
          error={errors.title}
          placeholder="e.g. Finish lab report"
          maxLength={200}
          autoFocus
          required
        />

        <div>
          <label htmlFor="task-description" className="mb-1.5 block text-sm font-medium text-ink">
            Description <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="task-description"
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            rows={4}
            placeholder="Details, links, acceptance criteria…"
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-ink">Priority</legend>
          <div className="flex gap-2">
            {PRIORITIES.map((option) => {
              const selected = values.priority === option.value
              return (
                <label key={option.value} className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="task-priority"
                    value={option.value}
                    checked={selected}
                    onChange={() => set('priority', option.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors duration-150',
                      selected
                        ? 'border-accent bg-surface-2 font-medium text-ink'
                        : 'border-line text-ink-muted hover:text-ink',
                      'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                    )}
                  >
                    {option.label}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Due date"
            type="date"
            value={values.dueDate}
            onChange={(event) => set('dueDate', event.target.value)}
            error={errors.dueDate}
            hint="Leave empty for no due date."
          />
          <div>
            <Input
              label="Category"
              value={values.category}
              onChange={(event) => set('category', event.target.value)}
              error={errors.category}
              placeholder="e.g. Academic"
              list={datalistId}
            />
            <datalist id={datalistId}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        </div>

        {submitError ? (
          <p
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {submitError}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
