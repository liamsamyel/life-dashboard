import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { cn } from '../../lib/cn'
import {
  academicToFormValues,
  emptyAcademicValues,
  hasFormErrors,
  validateAcademicForm,
  type AcademicFormErrors,
  type AcademicFormValues,
} from '../../lib/academic'
import type { AcademicItem, AcademicItemKind, ItemStatus, Priority, Subject } from '../../types'

interface ItemFormDialogProps {
  open: boolean
  /** Existing item to edit, or null to create. */
  item: AcademicItem | null
  subjects: Subject[]
  onSubmit: (values: AcademicFormValues) => Promise<void>
  onClose: () => void
}

const KINDS: Array<{ value: AcademicItemKind; label: string }> = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
  { value: 'milestone', label: 'Milestone' },
]

const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const STATUSES: Array<{ value: ItemStatus; label: string }> = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

const SELECT =
  'w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Create/edit form for assignments, exams, and milestones. */
export function ItemFormDialog({ open, item, subjects, onSubmit, onClose }: ItemFormDialogProps) {
  const [values, setValues] = useState<AcademicFormValues>(emptyAcademicValues)
  const [errors, setErrors] = useState<AcademicFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset whenever the dialog opens, pre-filling from the item being edited.
  useEffect(() => {
    if (!open) return
    setValues(item ? academicToFormValues(item) : emptyAcademicValues())
    setErrors({})
    setSubmitError(null)
    setSubmitting(false)
  }, [open, item])

  function set<K extends keyof AcademicFormValues>(key: K, value: AcademicFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const nextErrors = validateAcademicForm(values)
    setErrors(nextErrors)
    if (hasFormErrors(nextErrors)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save this item.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={submitting}
      title={item ? 'Edit item' : 'New item'}
      description={
        item
          ? 'Changes save to your Firestore document.'
          : 'Add an assignment, exam, or milestone to the planner.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : item ? 'Save changes' : 'Create item'}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Title"
          value={values.title}
          onChange={(event) => set('title', event.target.value)}
          error={errors.title}
          placeholder="e.g. Lab 5 — security rules"
          maxLength={200}
          autoFocus
          required
        />

        <div>
          <label htmlFor="item-description" className="mb-1.5 block text-sm font-medium text-ink">
            Description <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="item-description"
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            rows={3}
            placeholder="Requirements, coverage, notes…"
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="item-kind" className="mb-1.5 block text-sm font-medium text-ink">
              Type
            </label>
            <select
              id="item-kind"
              value={values.kind}
              onChange={(event) => set('kind', event.target.value as AcademicItemKind)}
              className={SELECT}
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="item-subject" className="mb-1.5 block text-sm font-medium text-ink">
              Subject
            </label>
            <select
              id="item-subject"
              value={values.subjectId}
              onChange={(event) => set('subjectId', event.target.value)}
              className={SELECT}
            >
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code ? `${subject.code} — ${subject.name}` : subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

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
            <label htmlFor="item-status" className="mb-1.5 block text-sm font-medium text-ink">
              Status
            </label>
            <select
              id="item-status"
              value={values.status}
              onChange={(event) => set('status', event.target.value as ItemStatus)}
              className={SELECT}
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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
                    name="item-priority"
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

        {values.status === 'in_progress' ? (
          <Input
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={values.progress}
            onChange={(event) => set('progress', event.target.value)}
            error={errors.progress}
            hint="Whole number 0–100. Completed items save at 100%, not started at 0%."
          />
        ) : null}

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
