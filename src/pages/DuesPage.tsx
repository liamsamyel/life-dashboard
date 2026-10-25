import { CalendarClock, Check, CircleAlert, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState, LoadingState } from '../components/ui/DataState'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { useCollection } from '../hooks/useCollection'
import { usePreferences } from '../hooks/usePreferences'
import { isValidISODate, parseISODate, todayISO } from '../lib/dates'
import { formatDate, formatPHP } from '../lib/format'
import type { Bill, BillRecurrence } from '../types'

interface BillForm { title: string; amount: string; dueDate: string; recurrence: BillRecurrence }
const EMPTY: BillForm = { title: '', amount: '', dueDate: todayISO(), recurrence: 'once' }

function nextMonthDate(iso: string, billingDay: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const nextMonth = new Date(year, month, 1)
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
  const nextDay = Math.min(billingDay || day, lastDay)
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
}

export default function DuesPage() {
  const dues = useCollection<Bill>('bills')
  const { profile } = usePreferences()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [form, setForm] = useState<BillForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const closeDialog = useCallback(() => setOpen(false), [])
  const dateFormat = profile?.dateFormat ?? 'YYYY-MM-DD'
  const today = todayISO()
  const bills = useMemo(() => [...dues.rows].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [dues.rows])

  useEffect(() => {
    if (!open) return
    setForm(editing ? { title: editing.title, amount: String(editing.amount), dueDate: editing.dueDate, recurrence: editing.recurrence } : { ...EMPTY, dueDate: todayISO() })
    setError(null)
  }, [open, editing])

  function startCreate() { setEditing(null); setOpen(true) }
  function startEdit(bill: Bill) { setEditing(bill); setOpen(true) }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const title = form.title.trim()
    const amount = Number(form.amount)
    if (!title || title.length > 120) { setError('Enter a name up to 120 characters.'); return }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) { setError('Enter an amount greater than ₱0 and no more than ₱100,000,000.'); return }
    if (!isValidISODate(form.dueDate)) { setError('Choose a valid due date.'); return }
    setSubmitBusy(true); setError(null)
    try {
      const values = { title, amount, dueDate: form.dueDate, recurrence: form.recurrence, billingDay: Number(form.dueDate.slice(-2)), paid: false }
      if (editing) await dues.update(editing.id, values)
      else await dues.create(values)
      setOpen(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this bill.') }
    finally { setSubmitBusy(false) }
  }

  async function markPaid(bill: Bill) {
    setBusyId(bill.id); setError(null)
    try {
      if (bill.recurrence === 'monthly') await dues.update(bill.id, { dueDate: nextMonthDate(bill.dueDate, bill.billingDay ?? Number(bill.dueDate.slice(-2))), paid: false })
      else await dues.update(bill.id, { paid: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update this bill.') }
    finally { setBusyId(null) }
  }

  async function remove(bill: Bill) {
    if (!window.confirm(`Delete “${bill.title}”?`)) return
    setBusyId(bill.id); setError(null)
    try { await dues.remove(bill.id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete this bill.') }
    finally { setBusyId(null) }
  }

  return <div>
    <PageHeader title="Bills & dues" description="Keep upcoming bill payments together and get them in your daily email digest." actions={<Button variant="primary" onClick={startCreate}><Plus className="h-4 w-4" /> Add a bill</Button>} />
    {dues.loading ? <LoadingState label="Loading bills…" /> : dues.error ? <ErrorState message={dues.error} onRetry={dues.reload} /> : <Card>
      <CardHeader title="Upcoming payments" subtitle="Monthly bills move to their next due date when marked paid." />
      {error && !open ? <p className="px-4 pb-3 text-sm text-danger" role="alert">{error}</p> : null}
      <CardBody>
        {bills.length === 0 ? <EmptyState icon={CalendarClock} title="No bills added yet" description="Add rent, subscriptions, utilities, or any other payment you want to remember." action={<Button onClick={startCreate}><Plus className="h-4 w-4" /> Add a bill</Button>} /> : <ul className="divide-y divide-line">
          {bills.map((bill) => {
            const overdue = !bill.paid && bill.dueDate < today
            return <li key={bill.id} className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className={`truncate text-sm font-medium ${bill.paid ? 'text-ink-muted line-through' : 'text-ink'}`}>{bill.title}</h3><Badge tone={bill.paid ? 'success' : overdue ? 'danger' : 'neutral'}>{bill.paid ? 'Paid' : overdue ? 'Overdue' : bill.recurrence === 'monthly' ? 'Monthly' : 'One-time'}</Badge></div>
                <p className="mt-1 text-xs text-ink-muted">{formatPHP(bill.amount)} · Due {formatDate(parseISODate(bill.dueDate), dateFormat)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!bill.paid ? <Button size="sm" variant="secondary" disabled={busyId === bill.id} onClick={() => void markPaid(bill)}><Check className="h-3.5 w-3.5" /> Paid</Button> : null}
                <Button size="sm" variant="ghost" aria-label={`Edit ${bill.title}`} disabled={busyId === bill.id} onClick={() => startEdit(bill)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${bill.title}`} disabled={busyId === bill.id} onClick={() => void remove(bill)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </li>
          })}
        </ul>}
      </CardBody>
    </Card>}
    <Dialog open={open} onClose={closeDialog} busy={submitBusy} title={editing ? 'Edit bill' : 'Add a bill'} description="Unpaid bills due within your reminder window, plus overdue bills, will appear in your daily email." footer={<><Button variant="secondary" onClick={closeDialog} disabled={submitBusy}>Cancel</Button><Button type="submit" form="bill-form" variant="primary" disabled={submitBusy}>{submitBusy ? 'Saving…' : 'Save bill'}</Button></>}>
      <form id="bill-form" onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <Input label="Bill or subscription" value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Internet" required autoFocus />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Amount (PHP)" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" required /><Input label="Next due date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required /></div>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">Repeats</span><select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as BillRecurrence })} className="h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink"><option value="once">One time</option><option value="monthly">Monthly</option></select><span className="mt-1.5 block text-xs text-ink-muted">Marking a monthly bill paid moves it to its next monthly due date.</span></label>
        {error ? <p className="flex items-start gap-2 text-sm text-danger" role="alert"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
      </form>
    </Dialog>
  </div>
}
