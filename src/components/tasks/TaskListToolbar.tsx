import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { TaskSort, TaskView } from '../../lib/derive'

interface TaskListToolbarProps {
  view: TaskView
  onViewChange: (view: TaskView) => void
  /** Number of tasks in each view, for the tab labels. */
  counts: Record<TaskView, number>
  search: string
  onSearchChange: (search: string) => void
  sort: TaskSort
  onSortChange: (sort: TaskSort) => void
  category: string
  onCategoryChange: (category: string) => void
  categories: string[]
  disabled?: boolean
}

const VIEW_LABELS: Array<{ value: TaskView; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
]

const SORT_LABELS: Array<{ value: TaskSort; label: string }> = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'createdAt', label: 'Newest' },
]

const SELECT_CLASS =
  'h-9 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/**
 * Search box, view filter (with counts), sort order, and category filter.
 * The view buttons use `aria-pressed` so their state is exposed, and every
 * label carries visible text — no color-only status.
 */
export function TaskListToolbar({
  view,
  onViewChange,
  counts,
  search,
  onSearchChange,
  sort,
  onSortChange,
  category,
  onCategoryChange,
  categories,
  disabled,
}: TaskListToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="relative">
        <label htmlFor="task-search" className="sr-only">
          Search tasks
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          id="task-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title or description…"
          disabled={disabled}
          className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter tasks by view" className="flex flex-wrap gap-1.5">
          {VIEW_LABELS.map((option) => {
            const active = view === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onViewChange(option.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line text-ink-muted hover:text-ink',
                )}
              >
                {option.label}
                <span className="ml-1.5 tabular-nums text-[11px] opacity-80">
                  {counts[option.value]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Sort
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as TaskSort)}
              disabled={disabled}
              className={SELECT_CLASS}
            >
              {SORT_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Category
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              disabled={disabled}
              className={SELECT_CLASS}
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
    </div>
  )
}
