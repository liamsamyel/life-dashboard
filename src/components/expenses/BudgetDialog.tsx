import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { parseBudgetAmount } from '../../lib/finance'
import { formatPHP } from '../../lib/format'

interface BudgetDialogProps {
  open: boolean
  /** Human month label, e.g. "October 2026". */
  month: string
  /** Current budget for that month (0 when none is set). */
  amount: number
  onSubmit: (amount: number) => Promise<void>
  onClose: () => void
}

/**
 * Set the monthly budget. The value is stored per month, so changing it
 * never rewrites earlier months.
 */
export function BudgetDialog({ open, month, amount, onSubmit, onClose }: BudgetDialogProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValue(amount > 0 ? amount.toFixed(2) : '')
    setError(null)
    setSubmitError(null)
    setSubmitting(false)
  }, [open, amount])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const parsed = parseBudgetAmount(value)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }

    setError(null)
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(parsed.amount)
      onClose()
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : 'Could not save the budget.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={submitting}
      title="Monthly budget"
      description={`Spending limit for ${month}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="budget-form" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Budget amount (PHP)"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          error={error ?? undefined}
          hint={
            amount > 0
              ? `Current budget: ${formatPHP(amount)}. Enter 0 to clear it.`
              : 'No budget set for this month yet.'
          }
          placeholder="8000.00"
          autoFocus
          autoComplete="off"
        />

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
