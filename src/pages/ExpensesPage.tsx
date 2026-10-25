import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BudgetDialog } from '../components/expenses/BudgetDialog'
import { CategoryBreakdownChart, MonthlyTrendChart } from '../components/expenses/FinanceCharts'
import { TransactionFormDialog } from '../components/expenses/TransactionFormDialog'
import { TransactionRow } from '../components/expenses/TransactionRow'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useFinance } from '../hooks/useFinance'
import { usePreferences } from '../hooks/usePreferences'
import {
  categorySuggestions,
  currentMonthKey,
  filterTransactions,
  monthCategories,
  monthLabel,
  monthTotals,
  monthlyTrend,
  shiftMonthKey,
  spendingByCategory,
  type TransactionFormValues,
} from '../lib/finance'
import { formatPHP } from '../lib/format'
import { cn } from '../lib/cn'
import type { Transaction, TransactionType } from '../types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

const SELECT =
  'h-9 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60'

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink disabled:opacity-40'

const TYPE_FILTERS: Array<{ value: TransactionType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
]

/**
 * Expense tracker (stage 5): income and expenses in Philippine pesos with a
 * per-month budget, remaining-budget math, category and monthly-trend charts,
 * and month/type/category/search filtering — all live from Firestore and
 * private to the signed-in user.
 */
export default function ExpensesPage() {
  const {
    transactions,
    loading,
    error,
    readOnly,
    source,
    reload,
    createTransaction,
    updateTransaction,
    removeTransaction,
    budgetFor,
    saveBudget,
  } = useFinance()
  const { profile } = usePreferences()
  const dateFormat = profile?.dateFormat ?? 'YYYY-MM-DD'
  const [searchParams, setSearchParams] = useSearchParams()
  const now = useMemo(() => new Date(), [])

  const [month, setMonth] = useState(() => currentMonthKey(now))
  const [type, setType] = useState<TransactionType | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)

  // Dashboard quick action: /expenses?new=1 opens the create form once.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    setSearchParams({}, { replace: true })
    if (readOnly) return
    setEditing(null)
    setFormOpen(true)
  }, [searchParams, readOnly, setSearchParams])

  const isCurrentMonth = month === currentMonthKey(now)
  const budgetAmount = budgetFor(month)?.amount ?? 0

  // Memoized so the summary and charts recompute only when data changes.
  const totals = useMemo(() => monthTotals(transactions, month), [transactions, month])
  const rows = useMemo(
    () => filterTransactions(transactions, { month, type, category, search }),
    [transactions, month, type, category, search],
  )
  const categories = useMemo(() => monthCategories(transactions, month), [transactions, month])
  const breakdown = useMemo(() => spendingByCategory(transactions, month), [transactions, month])
  const trend = useMemo(() => monthlyTrend(transactions, 6, now), [transactions, now])
  const suggestions = useMemo(
    () => ({
      expense: categorySuggestions(transactions, 'expense'),
      income: categorySuggestions(transactions, 'income'),
    }),
    [transactions],
  )

  const remaining = budgetAmount - totals.expense
  const overBudget = budgetAmount > 0 && remaining < 0
  const monthHasEntries = useMemo(
    () => transactions.some((entry) => entry.transactionOn.startsWith(month)),
    [transactions, month],
  )

  const changeMonth = useCallback((delta: number) => {
    setMonth((current) => shiftMonthKey(current, delta))
    setCategory('all')
  }, [])

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function clearFilters(): void {
    setSearch('')
    setType('all')
    setCategory('all')
  }

  async function handleSubmit(values: TransactionFormValues): Promise<void> {
    try {
      if (editing) await updateTransaction(editing.id, values)
      else await createTransaction(values)
      setWriteError(null)
    } catch (submitFailure) {
      setWriteError(errorMessage(submitFailure))
      throw submitFailure
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await removeTransaction(deleting.id)
      setDeleting(null)
    } catch (deleteFailure) {
      setDeleteError(errorMessage(deleteFailure))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Income, spending, and your monthly budget in Philippine pesos."
        actions={
          <>
            <div className="flex items-center rounded-md border border-line bg-surface">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className={cn(ICON_BUTTON, 'rounded-r-none')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-[9.5rem] px-1 text-center text-sm font-medium text-ink">
                {monthLabel(month)}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className={cn(ICON_BUTTON, 'rounded-l-none')}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Button variant="primary" onClick={openCreate} disabled={readOnly}>
              <Wallet className="h-4 w-4" aria-hidden="true" />
              Add transaction
            </Button>
          </>
        }
      />

      {source === 'sample' ? (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Sample-data mode — transactions are read-only here. Configure Firebase in{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env</code> to record your
          own.
        </div>
      ) : null}

      {writeError ? (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <span className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {writeError}
          </span>
          <button
            type="button"
            onClick={() => setWriteError(null)}
            aria-label="Dismiss error"
            className="shrink-0 rounded p-0.5 hover:bg-danger/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Loading transactions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader
              title="Month summary"
              subtitle={isCurrentMonth ? `${monthLabel(month)} — this month` : monthLabel(month)}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setBudgetOpen(true)}
                  disabled={readOnly}
                >
                  {budgetAmount > 0 ? 'Edit budget' : 'Set budget'}
                </Button>
              }
            />
            <CardBody>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted">Income</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-success">
                    {formatPHP(totals.income)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted">Expenses</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                    {formatPHP(totals.expense)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted">
                    {overBudget ? 'Over budget' : 'Remaining'}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-lg font-semibold tabular-nums',
                      overBudget ? 'text-danger' : 'text-ink',
                    )}
                  >
                    {formatPHP(remaining)}
                  </p>
                </div>
              </div>

              {budgetAmount > 0 ? (
                <>
                  <ProgressBar
                    value={totals.expense}
                    max={budgetAmount}
                    label="Monthly budget usage"
                    tone={overBudget ? 'danger' : 'accent'}
                    className="mt-4"
                  />
                  <p className="mt-2 text-xs text-ink-muted">
                    {formatPHP(totals.expense)} of {formatPHP(budgetAmount)} spent
                    {overBudget ? ' — over budget' : ''}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-xs text-ink-muted">
                  No budget set for this month. Set one to track how much is left.
                </p>
              )}

              {!isCurrentMonth ? (
                <button
                  type="button"
                  onClick={() => {
                    setMonth(currentMonthKey(now))
                    setCategory('all')
                  }}
                  className="mt-3 text-xs font-medium text-accent hover:underline"
                >
                  Jump to this month
                </button>
              ) : null}
            </CardBody>
          </Card>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryBreakdownChart rows={breakdown} subtitle={monthLabel(month)} />
            <MonthlyTrendChart points={trend} />
          </div>

          <Card>
            <CardHeader title="Transactions" subtitle={`${rows.length} shown`} />
            <CardBody className="border-b border-line">
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="transaction-search" className="sr-only">
                    Search transactions
                  </label>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="transaction-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search category or description…"
                    className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div role="group" aria-label="Filter transactions by type" className="flex flex-wrap gap-1.5">
                    {TYPE_FILTERS.map((option) => {
                      const active = type === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setType(option.value)}
                          className={cn(
                            'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
                            active
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-line text-ink-muted hover:text-ink',
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>

                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    Category
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className={SELECT}
                    >
                      <option value="all">All</option>
                      {categories.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </CardBody>

            {rows.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={
                  monthHasEntries ? 'No matching transactions' : `No transactions in ${monthLabel(month)}`
                }
                description={
                  monthHasEntries
                    ? 'No entries match the current search and filters. Clear them to see everything in this month.'
                    : 'Record an expense or some income and it will appear here with its category and date.'
                }
                action={
                  monthHasEntries ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : readOnly ? undefined : (
                    <Button variant="primary" onClick={openCreate}>
                      <Wallet className="h-4 w-4" aria-hidden="true" />
                      Add transaction
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    dateFormat={dateFormat}
                    onEdit={(selected) => {
                      setEditing(selected)
                      setFormOpen(true)
                    }}
                    onDelete={(selected) => {
                      setDeleteError(null)
                      setDeleting(selected)
                    }}
                  />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <TransactionFormDialog
        open={formOpen}
        transaction={editing}
        categories={suggestions}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />

      <BudgetDialog
        open={budgetOpen}
        month={monthLabel(month)}
        amount={budgetAmount}
        onSubmit={(amount) => saveBudget(month, amount)}
        onClose={() => setBudgetOpen(false)}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete transaction?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete transaction'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {deleting ? (
            <>
              <span className="font-medium text-ink">
                {deleting.description || deleting.category}
              </span>{' '}
              ({formatPHP(deleting.amount)}) will be permanently removed and your monthly totals
              will change. This can’t be undone.
            </>
          ) : null}
        </p>
        {deleteError ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {deleteError}
          </p>
        ) : null}
      </Dialog>
    </div>
  )
}
