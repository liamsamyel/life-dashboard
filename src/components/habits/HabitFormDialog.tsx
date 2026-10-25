import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { cn } from '../../lib/cn'
import {
  emptyHabitValues,
  hasFormErrors,
  habitToFormValues,
  validateHabitForm,
  type HabitFormErrors,
  type HabitFormValues,
} from '../../lib/habit'
import type { Habit, HabitFrequency } from '../../types'

interface HabitFormDialogProps {
  open: boolean
  /** Existing habit to edit, or null to create. */
  habit: Habit | null
  onSubmit: (values: HabitFormValues) => Promise<void>
  onClose: () => void
}

const FREQUENCIES: Array<{ value: HabitFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

/** Create/edit form for habits, including the weekly times-per-week target. */
export function HabitFormDialog({ open, habit, onSubmit, onClose }: HabitFormDialogProps) {
  const [values, setValues] = useState<HabitFormValues>(emptyHabitValues)
  const [errors, setErrors] = useState<HabitFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(habit ? habitToFormValues(habit) : emptyHabitValues())
    setErrors({})
    setSubmitError(null)
    setSubmitting(false)
  }, [open, habit])

  function set<K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const nextErrors = validateHabitForm(values)
    setErrors(nextErrors)
    if (hasFormErrors(nextErrors)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the habit.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={submitting}
      title={habit ? 'Edit habit' : 'New habit'}
      description={
        habit
          ? 'Changes save to your Firestore document — past completions stay.'
          : 'Pick something you want to keep doing.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="habit-form" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : habit ? 'Save changes' : 'Create habit'}
          </Button>
        </>
      }
    >
      <form id="habit-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Habit name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          error={errors.name}
          placeholder="e.g. Read for 30 minutes"
          maxLength={80}
          autoFocus
          required
        />

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-ink">Frequency</legend>
          <div className="flex gap-2">
            {FREQUENCIES.map((option) => {
              const selected = values.frequency === option.value
              return (
                <label key={option.value} className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="habit-frequency"
                    value={option.value}
                    checked={selected}
                    onChange={() => set('frequency', option.value)}
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

        {values.frequency === 'weekly' ? (
          <Input
            label="Times per week"
            type="number"
            min={1}
            max={7}
            inputMode="numeric"
            value={values.targetPerPeriod}
            onChange={(event) => set('targetPerPeriod', event.target.value)}
            error={errors.targetPerPeriod}
            hint="Your goal for each week, from 1 to 7."
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
