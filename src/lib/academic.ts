import type { AcademicItem, AcademicItemKind, ItemStatus, Priority, Subject } from '../types'
import { addDays, isValidISODate, parseISODate, startOfWeek, toISODate } from './dates'
import { PRIORITY_RANK } from './derive'

/**
 * Pure logic for the academic planner: form handling for subjects and
 * academic items (assignments, exams, milestones), list filtering, summary
 * statistics, and the month calendar grid. Everything here is unit-tested;
 * components only compose it.
 */

// ---------------------------------------------------------------------------
// Academic item form
// ---------------------------------------------------------------------------

export const ACADEMIC_TITLE_MAX = 160

/** Values handled by the item create/edit form (strings straight from inputs). */
export interface AcademicFormValues {
  title: string
  description: string
  kind: AcademicItemKind
  /** `''` when the item has no subject. */
  subjectId: string
  /** `YYYY-MM-DD`, or `''` when the item has no due date. */
  dueDate: string
  priority: Priority
  status: ItemStatus
  /** Completion as typed: `''` or a whole number 0–100. */
  progress: string
}

export type AcademicFormErrors = Partial<Record<'title' | 'dueDate' | 'progress', string>>

export function emptyAcademicValues(): AcademicFormValues {
  return {
    title: '',
    description: '',
    kind: 'assignment',
    subjectId: '',
    dueDate: '',
    priority: 'medium',
    status: 'not_started',
    progress: '',
  }
}

export function academicToFormValues(item: AcademicItem): AcademicFormValues {
  return {
    title: item.title,
    description: item.description ?? '',
    kind: item.kind,
    subjectId: item.subjectId ?? '',
    dueDate: item.dueDate ?? '',
    priority: item.priority,
    status: item.status,
    progress: String(item.progress),
  }
}

/** Returns an empty object when the values are acceptable. */
export function validateAcademicForm(values: AcademicFormValues): AcademicFormErrors {
  const errors: AcademicFormErrors = {}

  const title = values.title.trim()
  if (title.length === 0) {
    errors.title = 'Enter a title for this item.'
  } else if (title.length > ACADEMIC_TITLE_MAX) {
    errors.title = `Keep the title to ${ACADEMIC_TITLE_MAX} characters or fewer.`
  }

  if (values.dueDate !== '' && !isValidISODate(values.dueDate)) {
    errors.dueDate = 'Enter a valid due date.'
  }

  const progress = values.progress.trim()
  if (values.status === 'in_progress' && progress !== '') {
    if (!/^\d{1,3}$/.test(progress) || Number(progress) > 100) {
      errors.progress = 'Enter a whole number from 0 to 100.'
    }
  }

  return errors
}

export function hasFormErrors(errors: AcademicFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Persist-ready values. Status and progress are kept coherent:
 * completed → 100, not_started → 0, in_progress → the typed value.
 */
export function normalizeAcademicValues(values: AcademicFormValues): {
  title: string
  description: string | null
  kind: AcademicItemKind
  subjectId: string | null
  dueDate: string | null
  priority: Priority
  status: ItemStatus
  progress: number
} {
  let progress = 0
  if (values.status === 'completed') progress = 100
  else if (values.status === 'in_progress') progress = Number(values.progress.trim() || '0')

  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    kind: values.kind,
    subjectId: values.subjectId || null,
    dueDate: values.dueDate === '' ? null : values.dueDate,
    priority: values.priority,
    status: values.status,
    progress,
  }
}

// ---------------------------------------------------------------------------
// Subject form
// ---------------------------------------------------------------------------

export const SUBJECT_NAME_MAX = 120
export const SUBJECT_CODE_MAX = 40
export const SUBJECT_TERM_MAX = 60

export interface SubjectFormValues {
  name: string
  code: string
  term: string
}

export type SubjectFormErrors = Partial<Record<'name' | 'code' | 'term', string>>

export function emptySubjectValues(): SubjectFormValues {
  return { name: '', code: '', term: '' }
}

export function subjectToFormValues(subject: Subject): SubjectFormValues {
  return { name: subject.name, code: subject.code, term: subject.term }
}

export function validateSubjectForm(values: SubjectFormValues): SubjectFormErrors {
  const errors: SubjectFormErrors = {}

  const name = values.name.trim()
  if (name.length === 0) {
    errors.name = 'Enter the subject or course name.'
  } else if (name.length > SUBJECT_NAME_MAX) {
    errors.name = `Keep the name to ${SUBJECT_NAME_MAX} characters or fewer.`
  }

  if (values.code.trim().length > SUBJECT_CODE_MAX) {
    errors.code = `Keep the course code to ${SUBJECT_CODE_MAX} characters or fewer.`
  }
  if (values.term.trim().length > SUBJECT_TERM_MAX) {
    errors.term = `Keep the term to ${SUBJECT_TERM_MAX} characters or fewer.`
  }

  return errors
}

export function hasSubjectFormErrors(errors: SubjectFormErrors): boolean {
  return Object.keys(errors).length > 0
}

export function normalizeSubjectValues(values: SubjectFormValues): {
  name: string
  code: string
  term: string
} {
  return { name: values.name.trim(), code: values.code.trim(), term: values.term.trim() }
}

/** Display label for a subject id, or `''` when there is none / it's unknown. */
export function subjectLabel(subjects: Subject[], id: string | null): string {
  if (!id) return ''
  const subject = subjects.find((entry) => entry.id === id)
  if (!subject) return ''
  return subject.code ? `${subject.code} — ${subject.name}` : subject.name
}

// ---------------------------------------------------------------------------
// List filtering
// ---------------------------------------------------------------------------

export type PlannerView = 'upcoming' | 'all' | 'completed'

export interface AcademicListOptions {
  view: PlannerView
  /** `'all'` disables the kind filter. */
  kind: AcademicItemKind | 'all'
  /** `'all'` disables the subject filter. */
  subjectId: string | 'all'
  search: string
}

/**
 * The planner list's complete query: view, kind and subject filters, text
 * search, sorted by due date (overdue first, undated last) with priority and
 * title as tie-breakers — pure, so the page stays declarative and the
 * behavior is unit-tested.
 */
export function filterAndSortAcademic(
  items: AcademicItem[],
  options: AcademicListOptions,
): AcademicItem[] {
  let list = items
  if (options.view === 'upcoming') list = list.filter((item) => item.status !== 'completed')
  else if (options.view === 'completed') list = list.filter((item) => item.status === 'completed')

  if (options.kind !== 'all') list = list.filter((item) => item.kind === options.kind)
  if (options.subjectId !== 'all') {
    list = list.filter((item) => item.subjectId === options.subjectId)
  }

  const search = options.search.trim().toLowerCase()
  if (search) {
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(search) ||
        (item.description ?? '').toLowerCase().includes(search),
    )
  }

  return [...list].sort(
    (a, b) =>
      (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      a.title.localeCompare(b.title),
  )
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface AcademicStats {
  total: number
  open: number
  completed: number
  /** Open items whose due date has passed. */
  overdue: number
  byKind: Record<AcademicItemKind, number>
  /** Average progress across open items, 0–100. */
  averageProgress: number
}

export function academicStats(items: AcademicItem[], now: Date): AcademicStats {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const byKind: Record<AcademicItemKind, number> = { assignment: 0, exam: 0, milestone: 0 }
  let open = 0
  let completed = 0
  let overdue = 0
  let progressSum = 0

  for (const item of items) {
    byKind[item.kind] += 1
    if (item.status === 'completed') {
      completed += 1
      continue
    }
    open += 1
    progressSum += item.progress
    if (item.dueDate && parseISODate(item.dueDate).getTime() < today.getTime()) overdue += 1
  }

  return {
    total: items.length,
    open,
    completed,
    overdue,
    byKind,
    averageProgress: open > 0 ? Math.round(progressSum / open) : 0,
  }
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarCell {
  /** `YYYY-MM-DD`. */
  isoDate: string
  day: number
  inMonth: boolean
}

/**
 * Fixed 6-week (42 cell) grid for the month containing `cursor`, Monday-first
 * to match `startOfWeek`. A fixed grid keeps the calendar from jumping
 * between months as rows come and go.
 */
export function monthCells(cursor: Date): CalendarCell[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const cells: CalendarCell[] = []
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index)
    cells.push({
      isoDate: toISODate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === cursor.getMonth(),
    })
  }
  return cells
}

/** Items grouped by due date; items without a due date are skipped. */
export function groupByDueDate(items: AcademicItem[]): Map<string, AcademicItem[]> {
  const groups = new Map<string, AcademicItem[]>()
  for (const item of items) {
    if (!item.dueDate) continue
    const bucket = groups.get(item.dueDate)
    if (bucket) bucket.push(item)
    else groups.set(item.dueDate, [item])
  }
  return groups
}
