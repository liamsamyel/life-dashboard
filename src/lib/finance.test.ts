import { describe, expect, it } from 'vitest'
import type { MonthlyBudget, Transaction } from '../types'
import {
  budgetDocId,
  budgetForMonth,
  categorySuggestions,
  currentMonthKey,
  emptyTransactionValues,
  filterTransactions,
  hasFormErrors,
  monthCategories,
  monthKeyOf,
  monthLabel,
  monthTotals,
  monthlyTrend,
  normalizeTransactionValues,
  parseAmount,
  parseBudgetAmount,
  shiftMonthKey,
  spendingByCategory,
  sumByType,
  transactionToFormValues,
  validateTransactionForm,
} from './finance'

const NOW = new Date(2026, 9, 24, 12) // Saturday, 24 October 2026
const USER = 'user-1'

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction {
  return {
    userId: USER,
    type: 'expense',
    amount: 100,
    category: 'Food',
    description: null,
    transactionOn: '2026-10-24',
    createdAt: '2026-10-24T08:00:00.000Z',
    ...overrides,
  }
}

function budget(month: string, amount: number): MonthlyBudget {
  return { id: `${USER}_${month}`, userId: USER, month: `${month}-01`, amount }
}

describe('parseAmount', () => {
  it('accepts plain, grouped, and peso-prefixed amounts', () => {
    expect(parseAmount('1250')).toBe(1250)
    expect(parseAmount('1,234.50')).toBe(1234.5)
    expect(parseAmount('  ₱ 85.00 ')).toBe(85)
    expect(parseAmount('0.5')).toBe(0.5)
  })

  it('rejects malformed input instead of guessing', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.2.3')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('12.345')).toBeNull()
  })
})

describe('transaction form', () => {
  it('starts as an expense dated today', () => {
    const values = emptyTransactionValues(NOW)
    expect(values.type).toBe('expense')
    expect(values.amount).toBe('')
    expect(values.transactionOn).toBe('2026-10-24')
  })

  it('requires a positive amount and a valid date', () => {
    const errors = validateTransactionForm({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      transactionOn: '',
    })
    expect(errors.amount).toBe('Enter an amount.')
    expect(errors.transactionOn).toBe('Pick the date of this transaction.')

    expect(
      validateTransactionForm({
        type: 'expense',
        amount: '0',
        category: '',
        description: '',
        transactionOn: '2026-02-30',
      }).amount,
    ).toBe('Amount must be greater than zero.')

    expect(
      validateTransactionForm({
        type: 'income',
        amount: '1250.50',
        category: 'Allowance',
        description: '',
        transactionOn: '2026-10-24',
      }),
    ).toEqual({})
  })

  it('keeps a blank category as Uncategorized and trims fields', () => {
    const normalized = normalizeTransactionValues({
      type: 'income',
      amount: '5,000',
      category: '   ',
      description: '  Monthly allowance  ',
      transactionOn: '2026-10-01',
    })
    expect(normalized).toEqual({
      type: 'income',
      amount: 5000,
      category: 'Uncategorized',
      description: 'Monthly allowance',
      transactionOn: '2026-10-01',
    })
    expect(hasFormErrors({})).toBe(false)
    expect(hasFormErrors({ amount: 'bad' })).toBe(true)
  })

  it('round-trips a stored transaction into form values', () => {
    const values = transactionToFormValues(tx({ id: 't1', amount: 185.5, description: 'Lunch' }))
    expect(values.amount).toBe('185.50')
    expect(values.description).toBe('Lunch')
    expect(values.transactionOn).toBe('2026-10-24')
  })
})

describe('month helpers', () => {
  it('formats and shifts month keys across year boundaries', () => {
    expect(monthKeyOf(NOW)).toBe('2026-10')
    expect(currentMonthKey(NOW)).toBe('2026-10')
    expect(shiftMonthKey('2026-10', -1)).toBe('2026-09')
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
    expect(monthLabel('2026-10')).toBe('October 2026')
  })

  it('builds a stable per-user, per-month budget id', () => {
    expect(budgetDocId('abc', '2026-10')).toBe('abc_2026-10')
    expect(budgetDocId('abc', '2026-10')).toBe(budgetDocId('abc', '2026-10'))
  })

  it('finds the budget for a month only', () => {
    const budgets = [budget('2026-09', 7000), budget('2026-10', 8000)]
    expect(budgetForMonth(budgets, '2026-10')?.amount).toBe(8000)
    expect(budgetForMonth(budgets, '2026-11')).toBeNull()
  })

  it('parses the budget field, treating empty as zero', () => {
    expect(parseBudgetAmount('')).toEqual({ amount: 0 })
    expect(parseBudgetAmount('8,000')).toEqual({ amount: 8000 })
    expect(parseBudgetAmount('abc')).toEqual({ error: 'Enter a number, e.g. 8000 or 8000.50.' })
  })
})

describe('totals and filters', () => {
  const transactions: Transaction[] = [
    tx({ id: 'a', type: 'income', amount: 5000, category: 'Allowance', transactionOn: '2026-10-01' }),
    tx({ id: 'b', category: 'Food', amount: 185, transactionOn: '2026-10-24' }),
    tx({ id: 'c', category: 'Transport', amount: 240, transactionOn: '2026-10-22', description: 'Fare' }),
    tx({ id: 'd', category: 'Food', amount: 620, transactionOn: '2026-09-30' }),
    tx({ id: 'e', type: 'income', amount: 2500, category: 'Freelance', transactionOn: '2026-10-05' }),
  ]

  it('sums income and expenses separately', () => {
    expect(sumByType(transactions)).toEqual({ income: 7500, expense: 1045 })
    expect(monthTotals(transactions, '2026-10')).toEqual({ income: 7500, expense: 425 })
    expect(monthTotals(transactions, '2026-09')).toEqual({ income: 0, expense: 620 })
  })

  it('scopes to the month, newest first', () => {
    const visible = filterTransactions(transactions, {
      month: '2026-10',
      type: 'all',
      category: 'all',
      search: '',
    })
    expect(visible.map((entry) => entry.id)).toEqual(['b', 'c', 'e', 'a'])
  })

  it('filters by type, category, and search text', () => {
    const expenses = filterTransactions(transactions, {
      month: '2026-10',
      type: 'expense',
      category: 'all',
      search: '',
    })
    expect(expenses.map((entry) => entry.id)).toEqual(['b', 'c'])

    const food = filterTransactions(transactions, {
      month: '2026-10',
      type: 'all',
      category: 'Food',
      search: '',
    })
    expect(food.map((entry) => entry.id)).toEqual(['b'])

    const searched = filterTransactions(transactions, {
      month: '2026-10',
      type: 'all',
      category: 'all',
      search: 'fare',
    })
    expect(searched.map((entry) => entry.id)).toEqual(['c'])
  })

  it('lists the month categories and expands suggestions', () => {
    expect(monthCategories(transactions, '2026-10')).toEqual([
      'Allowance',
      'Food',
      'Freelance',
      'Transport',
    ])
    const suggestions = categorySuggestions(transactions, 'expense')
    expect(suggestions).toContain('Groceries')
    expect(suggestions).toContain('Transport')
    // Sorted and free of duplicates.
    expect(suggestions).toEqual([...new Set(suggestions)].sort((a, b) => a.localeCompare(b)))
  })
})

describe('spendingByCategory', () => {
  it('groups expenses by category with shares, largest first', () => {
    const transactions = [
      tx({ id: 'a', category: 'Food', amount: 300 }),
      tx({ id: 'b', category: 'Food', amount: 200 }),
      tx({ id: 'c', category: 'Transport', amount: 500 }),
      tx({ id: 'd', category: 'Allowance', amount: 5000, type: 'income' }),
    ]
    expect(spendingByCategory(transactions, '2026-10')).toEqual([
      { category: 'Food', amount: 500, percent: 50 },
      { category: 'Transport', amount: 500, percent: 50 },
    ])
  })

  it('returns nothing for a month without expenses', () => {
    expect(spendingByCategory([], '2026-10')).toEqual([])
  })
})

describe('monthlyTrend', () => {
  it('returns the requested months, oldest first, ending with now', () => {
    const trend = monthlyTrend([], 6, NOW)
    expect(trend.map((point) => point.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ])
    expect(trend[5].longLabel).toBe('October 2026')
    expect(trend.every((point) => point.income === 0 && point.expense === 0)).toBe(true)
  })

  it('buckets totals into the right months', () => {
    const transactions = [
      tx({ id: 'a', type: 'income', amount: 5000, transactionOn: '2026-10-01' }),
      tx({ id: 'b', amount: 185, transactionOn: '2026-10-24' }),
      tx({ id: 'c', amount: 620, transactionOn: '2026-08-15' }),
      tx({ id: 'd', amount: 999, transactionOn: '2025-01-15' }),
    ]
    const trend = monthlyTrend(transactions, 6, NOW)
    expect(trend.find((point) => point.month === '2026-10')).toMatchObject({
      income: 5000,
      expense: 185,
    })
    expect(trend.find((point) => point.month === '2026-08')?.expense).toBe(620)
    // Older than the window: excluded entirely.
    expect(trend.some((point) => point.month === '2025-01')).toBe(false)
  })
})
