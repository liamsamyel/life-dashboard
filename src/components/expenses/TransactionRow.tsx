import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { parseISODate } from '../../lib/dates'
import { formatDate, formatPHP } from '../../lib/format'
import type { DateFormat, Transaction } from '../../types'
import { Badge } from '../ui/Badge'

interface TransactionRowProps {
  transaction: Transaction
  dateFormat: DateFormat
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

/**
 * One income/expense entry. Direction is carried three ways — the signed
 * amount, the "Income"/"Expense" badge, and the color — so it never depends
 * on color alone.
 */
export function TransactionRow({ transaction, dateFormat, onEdit, onDelete }: TransactionRowProps) {
  const income = transaction.type === 'income'
  const label = transaction.description || transaction.category

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm leading-snug text-ink">{label}</span>
          <Badge tone={income ? 'success' : 'neutral'}>{income ? 'Income' : 'Expense'}</Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {transaction.category} · {formatDate(parseISODate(transaction.transactionOn), dateFormat)}
        </p>
      </div>

      <p
        className={cn(
          'shrink-0 pt-0.5 text-sm font-semibold tabular-nums',
          income ? 'text-success' : 'text-ink',
        )}
      >
        {formatPHP(income ? transaction.amount : -transaction.amount)}
      </p>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onEdit(transaction)}
          className={ICON_BUTTON}
          title="Edit transaction"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Edit {label}</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(transaction)}
          className={cn(ICON_BUTTON, 'hover:bg-danger/10 hover:text-danger')}
          title="Delete transaction"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Delete {label}</span>
        </button>
      </div>
    </li>
  )
}
