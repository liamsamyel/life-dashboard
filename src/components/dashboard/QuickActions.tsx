import { CircleDollarSign, PenLine, Play, Plus } from 'lucide-react'
import { ButtonLink } from '../ui/Button'

const ACTIONS = [
  { to: '/tasks?new=1', label: 'Add task', icon: Plus },
  { to: '/expenses?new=1', label: 'Add expense', icon: CircleDollarSign },
  { to: '/study', label: 'Start session', icon: Play },
  { to: '/notes?new=1', label: 'New note', icon: PenLine },
] as const

/**
 * Dashboard quick actions. `?new=1` deep-links open the create form directly
 * (Tasks, Expenses, and Notes all read it once on mount); the study action
 * just opens the tracker, where a session needs a subject choice first.
 */
export default function QuickActions() {
  return (
    <section aria-label="Quick actions" className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <ButtonLink key={action.to} to={action.to} variant="secondary">
          <action.icon className="h-4 w-4" aria-hidden="true" />
          {action.label}
        </ButtonLink>
      ))}
    </section>
  )
}
