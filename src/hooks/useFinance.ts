import type { MonthlyBudget, Transaction } from '../types'
import {
  budgetDocId,
  budgetForMonth,
  monthStart,
  normalizeTransactionValues,
  type TransactionFormValues,
} from '../lib/finance'
import { useAuth } from './useAuth'
import { useCollection } from './useCollection'

export interface UseFinanceResult {
  transactions: Transaction[]
  budgets: MonthlyBudget[]
  loading: boolean
  error: string | null
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  createTransaction: (values: TransactionFormValues) => Promise<void>
  updateTransaction: (id: string, values: TransactionFormValues) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  /** The stored budget for a `YYYY-MM` month, or null when never set. */
  budgetFor: (month: string) => MonthlyBudget | null
  /** Create or overwrite the budget for a month — one document per month. */
  saveBudget: (month: string, amount: number) => Promise<void>
}

/**
 * Income, expenses, and monthly budgets, live from Firestore.
 *
 * Budgets use the deterministic id `${uid}_${YYYY-MM}` (see
 * `lib/finance.budgetDocId`), so saving a month twice overwrites instead of
 * stacking — the app's stand-in for a UNIQUE(user, month) constraint.
 */
export function useFinance(): UseFinanceResult {
  const transactionsCollection = useCollection<Transaction>('transactions')
  const budgetsCollection = useCollection<MonthlyBudget>('budgets')
  const { user } = useAuth()
  const uid = user?.uid ?? null

  async function createTransaction(values: TransactionFormValues): Promise<void> {
    await transactionsCollection.create(normalizeTransactionValues(values))
  }

  async function updateTransaction(
    id: string,
    values: TransactionFormValues,
  ): Promise<void> {
    await transactionsCollection.update(id, normalizeTransactionValues(values))
  }

  async function removeTransaction(id: string): Promise<void> {
    await transactionsCollection.remove(id)
  }

  function budgetFor(month: string): MonthlyBudget | null {
    return budgetForMonth(budgetsCollection.rows, month)
  }

  async function saveBudget(month: string, amount: number): Promise<void> {
    if (!uid) throw new Error('Sign in to save your budget.')
    const id = budgetDocId(uid, month)
    // An empty/zero budget clears the month instead of leaving a 0 document.
    if (amount <= 0) {
      if (budgetFor(month)) await budgetsCollection.remove(id)
      return
    }
    await budgetsCollection.set(id, { month: monthStart(month), amount })
  }

  return {
    transactions: transactionsCollection.rows,
    budgets: budgetsCollection.rows,
    loading: transactionsCollection.loading || budgetsCollection.loading,
    error: transactionsCollection.error ?? budgetsCollection.error,
    readOnly: transactionsCollection.readOnly,
    source: transactionsCollection.source,
    reload: () => {
      transactionsCollection.reload()
      budgetsCollection.reload()
    },
    createTransaction,
    updateTransaction,
    removeTransaction,
    budgetFor,
    saveBudget,
  }
}
