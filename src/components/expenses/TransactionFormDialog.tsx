import { useEffect, useId, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { cn } from '../../lib/cn'
import {
  emptyTransactionValues,
  hasFormErrors,
  transactionToFormValues,
  validateTransactionForm,
  type TransactionFormErrors,
  type TransactionFormValues,
} from '../../lib/finance'
import type { Transaction, TransactionType } from '../../types'

interface TransactionFormDialogProps {
  open: boolean
  /** Existing transaction to edit, or null to create. */
  transaction: Transaction | null
  /** Category suggestions per type, offered as autocomplete. */
  categories: Record<TransactionType, string[]>
  onSubmit: (values: TransactionFormValues) => Promise<void>
  onClose: () => void
}

const TYPES: Array<{ value: TransactionType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

/**
 * Create/edit form for income and expenses. The type is a radio group (not a
 * dropdown) so both directions are visible, and every field error is written
 * out under its input.
 */
export function TransactionFormDialog({
  open,
  transaction,
  categories,
  onSubmit,
  onClose,
}: TransactionFormDialogProps) {
  const datalistId = useId()
  const [values, setValues] = useState<TransactionFormValues>(() => emptyTransactionValues())
  const [errors, setErrors] = useState<TransactionFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(transaction ? transactionToFormValues(transaction) : emptyTransactionValues())
    setErrors({})
    setSubmitError(null)
    setSubmitting(false)
  }, [open, transaction])

  function set<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K],
  ): void {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const nextErrors = validateTransactionForm(values)
    setErrors(nextErrors)
    if (hasFormErrors(nextErrors)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not save the transaction.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={submitting}
      title={transaction ? 'Edit transaction' : 'Add transaction'}
      description={
        transaction
          ? 'Changes save to your Firestore document.'
          : 'Record money in or out. Amounts are in Philippine pesos.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="transaction-form" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-ink">Type</legend>
          <div className="flex gap-2">
            {TYPES.map((option) => {
              const selected = values.type === option.value
              return (
                <label key={option.value} className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="transaction-type"
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      set('type', option.value)
                      setErrors({})
                    }}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors duration-150',
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
            label="Amount (PHP)"
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => set('amount', event.target.value)}
            error={errors.amount}
            placeholder="0.00"
            autoFocus
            autoComplete="off"
            required
          />
          <Input
            label="Date"
            type="date"
            value={values.transactionOn}
            onChange={(event) => set('transactionOn', event.target.value)}
            error={errors.transactionOn}
            required
          />
        </div>

        <Input
          label="Category"
          value={values.category}
          onChange={(event) => set('category', event.target.value)}
          error={errors.category}
          placeholder={values.type === 'income' ? 'e.g. Allowance' : 'e.g. Food'}
          list={datalistId}
          hint="Leave empty to file it under Uncategorized."
        />
        <datalist id={datalistId}>
          {categories[values.type].map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>

        <div>
          <label
            htmlFor="transaction-description"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Description <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="transaction-description"
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            rows={2}
            maxLength={200}
            placeholder={values.type === 'income' ? 'e.g. Monthly allowance' : 'e.g. Lunch at the cafeteria'}
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
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
