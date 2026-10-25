import type { MonthlyBudget, Transaction, TransactionType } from '../types'
import { addMonths, isValidISODate, parseISODate, todayISO } from './dates'

/**
 * Pure logic for the expense tracker: the income/expense form, month
 * navigation, list filtering, category breakdowns, and the monthly trend.
 *
 * Amounts are always positive PHP amounts; `type` carries the direction (the
 * security rules enforce the same shape). Everything here is unit-tested, so
 * the page only composes.
 */

export const TRANSACTION_CATEGORY_MAX = 60
export const TRANSACTION_DESCRIPTION_MAX = 200
export const TRANSACTION_AMOUNT_MAX = 100_000_000
export const DEFAULT_EXPENSE_CATEGORY = 'Uncategorized'

/** Common categories, offered as datalist suggestions (never forced). */
export const TRANSACTION_CATEGORIES: Record<TransactionType, string[]> = {
  expense: [
    'Food',
    'Transport',
    'Groceries',
    'School Supplies',
    'Internet',
    'Rent',
    'Health',
    'Entertainment',
    'Other',
  ],
  income: ['Allowance', 'Freelance', 'Scholarship', 'Salary', 'Gift', 'Other'],
}

// ---------------------------------------------------------------------------
// Transaction form
// ---------------------------------------------------------------------------

/** Values handled by the transaction create/edit form (strings from inputs). */
export interface TransactionFormValues {
  type: TransactionType
  /** Amount as typed, e.g. `1,234.50` or `185`. */
  amount: string
  category: string
  description: string
  /** `YYYY-MM-DD`. */
  transactionOn: string
}

export type TransactionFormErrors = Partial<
  Record<'amount' | 'category' | 'transactionOn', string>
>

export function emptyTransactionValues(now: Date = new Date()): TransactionFormValues {
  return {
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    transactionOn: todayISO(now),
  }
}

export function transactionToFormValues(transaction: Transaction): TransactionFormValues {
  return {
    type: transaction.type,
    amount: transaction.amount.toFixed(2),
    category: transaction.category,
    description: transaction.description ?? '',
    transactionOn: transaction.transactionOn,
  }
}

/**
 * Parse a typed amount. Accepts an optional ₱ sign, spaces and thousands
 * separators; rejects anything else (`1.2.3`, `abc`, `-5`).
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, '').replace(/^₱/, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function validateTransactionForm(
  values: TransactionFormValues,
): TransactionFormErrors {
  const errors: TransactionFormErrors = {}

  const amount = parseAmount(values.amount)
  if (values.amount.trim() === '') {
    errors.amount = 'Enter an amount.'
  } else if (amount === null) {
    errors.amount = 'Enter a number, e.g. 1250 or 1250.50.'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than zero.'
  } else if (amount > TRANSACTION_AMOUNT_MAX) {
    errors.amount = 'That amount is too large.'
  }

  if (values.category.trim().length > TRANSACTION_CATEGORY_MAX) {
    errors.category = `Keep the category to ${TRANSACTION_CATEGORY_MAX} characters or fewer.`
  }

  if (values.transactionOn === '') {
    errors.transactionOn = 'Pick the date of this transaction.'
  } else if (!isValidISODate(values.transactionOn)) {
    errors.transactionOn = 'Enter a valid date.'
  }

  return errors
}

export function hasFormErrors(errors: TransactionFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Persist-ready values: amount as a number, blank category defaulted. */
export function normalizeTransactionValues(values: TransactionFormValues): {
  type: TransactionType
  amount: number
  category: string
  description: string | null
  transactionOn: string
} {
  const amount = parseAmount(values.amount) ?? 0
  return {
    type: values.type,
    amount: Math.round(amount * 100) / 100,
    category: values.category.trim() || DEFAULT_EXPENSE_CATEGORY,
    description: values.description.trim() || null,
    transactionOn: values.transactionOn,
  }
}

/** Category suggestions: the common ones plus anything the user already used. */
export function categorySuggestions(
  transactions: Transaction[],
  type: TransactionType,
): string[] {
  const used = transactions.filter((tx) => tx.type === type).map((tx) => tx.category)
  return Array.from(new Set([...TRANSACTION_CATEGORIES[type], ...used])).sort((a, b) =>
    a.localeCompare(b),
  )
}

// ---------------------------------------------------------------------------
// Months and budgets
// ---------------------------------------------------------------------------

/** `YYYY-MM` for the month containing `date`. */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthKey(now: Date = new Date()): string {
  return monthKeyOf(now)
}

/** Move a `YYYY-MM` month key by whole months (negative goes back). */
export function shiftMonthKey(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return monthKeyOf(addMonths(new Date(year, monthNumber - 1, 1), delta))
}

/** Human month label, e.g. `October 2026`. */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(
    parseISODate(`${month}-01`),
  )
}

/** Short month label used on chart axes, e.g. `Oct`. */
export function shortMonthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(
    parseISODate(`${month}-01`),
  )
}

/** First day of the month, the stored `month` field (`YYYY-MM-01`). */
export function monthStart(month: string): string {
  return `${month}-01`
}

/**
 * Deterministic budget document id: one budget per user per month, so
 * saving twice overwrites instead of stacking (the app's equivalent of a
 * UNIQUE(user, month) constraint).
 */
export function budgetDocId(uid: string, month: string): string {
  return `${uid}_${month}`
}

export function budgetForMonth(
  budgets: MonthlyBudget[],
  month: string,
): MonthlyBudget | null {
  return budgets.find((budget) => budget.month === monthStart(month)) ?? null
}

// ---------------------------------------------------------------------------
// Totals, filtering, breakdowns
// ---------------------------------------------------------------------------

export interface TypeTotals {
  income: number
  expense: number
}

/** Sum a set of transactions into income and expense totals. */
export function sumByType(transactions: Transaction[]): TypeTotals {
  let income = 0
  let expense = 0
  for (const transaction of transactions) {
    if (transaction.type === 'income') income += transaction.amount
    else expense += transaction.amount
  }
  return { income, expense }
}

/** Income and expense totals for one `YYYY-MM` month. */
export function monthTotals(transactions: Transaction[], month: string): TypeTotals {
  return sumByType(transactions.filter((tx) => tx.transactionOn.startsWith(month)))
}

export interface TransactionFilterOptions {
  /** `YYYY-MM`; only transactions in that month are returned. */
  month: string
  /** `'all'` disables the type filter. */
  type: TransactionType | 'all'
  /** `'all'` disables the category filter. */
  category: string
  search: string
}

/**
 * The expense list's complete query: month, type, category, and text search,
 * newest first (then by creation time so same-day entries stay stable).
 */
export function filterTransactions(
  transactions: Transaction[],
  options: TransactionFilterOptions,
): Transaction[] {
  let list = transactions.filter((tx) => tx.transactionOn.startsWith(options.month))

  if (options.type !== 'all') list = list.filter((tx) => tx.type === options.type)
  if (options.category !== 'all') {
    list = list.filter((tx) => tx.category === options.category)
  }

  const search = options.search.trim().toLowerCase()
  if (search) {
    list = list.filter(
      (tx) =>
        tx.category.toLowerCase().includes(search) ||
        (tx.description ?? '').toLowerCase().includes(search),
    )
  }

  return [...list].sort(
    (a, b) =>
      b.transactionOn.localeCompare(a.transactionOn) ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id),
  )
}

/** Categories present in a month, for the filter dropdown. */
export function monthCategories(transactions: Transaction[], month: string): string[] {
  const inMonth = transactions.filter((tx) => tx.transactionOn.startsWith(month))
  return Array.from(new Set(inMonth.map((tx) => tx.category))).sort((a, b) =>
    a.localeCompare(b),
  )
}

export interface CategorySpend {
  category: string
  amount: number
  /** Share of the month's expenses, 0–100. */
  percent: number
}

/** Expense spending per category for one month, largest first. */
export function spendingByCategory(
  transactions: Transaction[],
  month: string,
): CategorySpend[] {
  const expenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.transactionOn.startsWith(month),
  )
  const totals = new Map<string, number>()
  for (const transaction of expenses) {
    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount)
  }
  const total = expenses.reduce((sum, tx) => sum + tx.amount, 0)

  return [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category))
}

export interface MonthTrendPoint extends TypeTotals {
  /** `YYYY-MM`. */
  month: string
  /** Short axis label, e.g. `Oct`. */
  label: string
  /** Full label, used in tooltips and the accessible summary. */
  longLabel: string
}

/**
 * Income and expense totals for the last `months` months ending with the
 * month containing `now`, oldest first — the monthly trend chart's data.
 */
export function monthlyTrend(
  transactions: Transaction[],
  months = 6,
  now: Date = new Date(),
): MonthTrendPoint[] {
  const base = currentMonthKey(now)
  const points: MonthTrendPoint[] = []
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const month = shiftMonthKey(base, -offset)
    points.push({
      month,
      label: shortMonthLabel(month),
      longLabel: monthLabel(month),
      ...monthTotals(transactions, month),
    })
  }
  return points
}

/** Validate the budget form value; empty means 0 (no budget). */
export function parseBudgetAmount(raw: string): { amount: number } | { error: string } {
  const trimmed = raw.trim()
  if (trimmed === '') return { amount: 0 }
  const amount = parseAmount(trimmed)
  if (amount === null) return { error: 'Enter a number, e.g. 8000 or 8000.50.' }
  if (amount > TRANSACTION_AMOUNT_MAX) return { error: 'That amount is too large.' }
  return { amount: Math.round(amount * 100) / 100 }
}
