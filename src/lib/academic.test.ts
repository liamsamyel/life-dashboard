import { describe, expect, it } from 'vitest'
import type { AcademicItem } from '../types'
import {
  academicStats,
  academicToFormValues,
  emptyAcademicValues,
  filterAndSortAcademic,
  groupByDueDate,
  hasFormErrors,
  monthCells,
  normalizeAcademicValues,
  normalizeSubjectValues,
  subjectLabel,
  validateAcademicForm,
  validateSubjectForm,
} from './academic'

const NOW = new Date(2026, 9, 24, 12) // Saturday, 24 October 2026
const USER = 'user-1'

function item(overrides: Partial<AcademicItem> & Pick<AcademicItem, 'id'>): AcademicItem {
  return {
    userId: USER,
    subjectId: null,
    projectId: null,
    kind: 'assignment',
    title: 'Item',
    description: null,
    dueDate: null,
    priority: 'medium',
    status: 'not_started',
    progress: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('validateAcademicForm', () => {
  it('requires a title', () => {
    const errors = validateAcademicForm({ ...emptyAcademicValues(), title: '   ' })
    expect(errors.title).toBeTruthy()
    expect(hasFormErrors(errors)).toBe(true)
  })

  it('rejects an over-long title', () => {
    const errors = validateAcademicForm({ ...emptyAcademicValues(), title: 'x'.repeat(161) })
    expect(errors.title).toContain('160')
  })

  it('rejects impossible dates but accepts empty or real ones', () => {
    expect(
      validateAcademicForm({ ...emptyAcademicValues(), title: 'A', dueDate: '2026-02-30' })
        .dueDate,
    ).toBeTruthy()
    expect(
      validateAcademicForm({ ...emptyAcademicValues(), title: 'A', dueDate: '' }).dueDate,
    ).toBeUndefined()
    expect(
      validateAcademicForm({ ...emptyAcademicValues(), title: 'A', dueDate: '2026-11-30' })
        .dueDate,
    ).toBeUndefined()
  })

  it('accepts blank, in-range progress and rejects the rest', () => {
    const base = { ...emptyAcademicValues(), title: 'A', status: 'in_progress' as const }
    expect(validateAcademicForm({ ...base, progress: '' }).progress).toBeUndefined()
    expect(validateAcademicForm({ ...base, progress: '0' }).progress).toBeUndefined()
    expect(validateAcademicForm({ ...base, progress: '100' }).progress).toBeUndefined()
    expect(validateAcademicForm({ ...base, progress: '101' }).progress).toBeTruthy()
    expect(validateAcademicForm({ ...base, progress: '40.5' }).progress).toBeTruthy()
    expect(validateAcademicForm({ ...base, progress: 'abc' }).progress).toBeTruthy()
  })

  it('passes a fully valid form with no errors', () => {
    const errors = validateAcademicForm({
      title: 'Lab 5',
      description: '',
      kind: 'assignment',
      subjectId: 'subject-1',
      dueDate: '2026-11-01',
      priority: 'high',
      status: 'in_progress',
      progress: '40',
    })
    expect(errors).toEqual({})
  })

  it('round-trips an existing item through form values without errors', () => {
    const original = item({ id: 'r', title: 'Lab 5', dueDate: '2026-11-01', status: 'in_progress', progress: 40, subjectId: 's1' })
    const values = academicToFormValues(original)
    expect(validateAcademicForm(values)).toEqual({})
    expect(normalizeAcademicValues(values)).toMatchObject({
      title: 'Lab 5',
      dueDate: '2026-11-01',
      status: 'in_progress',
      progress: 40,
      subjectId: 's1',
    })
  })
})

describe('normalizeAcademicValues', () => {
  it('keeps status and progress coherent', () => {
    const base = { ...emptyAcademicValues(), title: '  Lab 5  ', dueDate: '2026-11-01' }

    expect(normalizeAcademicValues({ ...base, status: 'completed', progress: '30' })).toMatchObject({
      status: 'completed',
      progress: 100,
    })
    expect(normalizeAcademicValues({ ...base, status: 'not_started', progress: '30' })).toMatchObject({
      status: 'not_started',
      progress: 0,
    })
    expect(normalizeAcademicValues({ ...base, status: 'in_progress', progress: '30' })).toMatchObject({
      status: 'in_progress',
      progress: 30,
    })
    expect(normalizeAcademicValues({ ...base, status: 'in_progress', progress: '' })).toMatchObject({
      progress: 0,
    })
  })

  it('trims text and maps blanks to nulls', () => {
    const normalized = normalizeAcademicValues({
      title: '  Lab 5  ',
      description: '   ',
      kind: 'assignment',
      subjectId: '',
      dueDate: '',
      priority: 'medium',
      status: 'not_started',
      progress: '',
    })
    expect(normalized).toMatchObject({
      title: 'Lab 5',
      description: null,
      subjectId: null,
      dueDate: null,
    })
  })
})

describe('subject form', () => {
  it('requires a name and caps field lengths', () => {
    expect(validateSubjectForm({ name: '', code: '', term: '' }).name).toBeTruthy()
    expect(validateSubjectForm({ name: 'IT 214', code: 'x'.repeat(41), term: '' }).code).toBeTruthy()
    expect(validateSubjectForm({ name: 'IT 214', code: '', term: 'x'.repeat(61) }).term).toBeTruthy()
    expect(validateSubjectForm({ name: 'Web Systems', code: 'IT 214', term: '1st Sem' })).toEqual({})
  })

  it('normalizes with trims', () => {
    expect(normalizeSubjectValues({ name: ' Web ', code: ' IT ', term: ' Sem ' })).toEqual({
      name: 'Web',
      code: 'IT',
      term: 'Sem',
    })
  })
})

describe('subjectLabel', () => {
  const subjects = [
    { id: 's1', userId: USER, name: 'Web Systems', code: 'IT 214', term: '', createdAt: '' },
    { id: 's2', userId: USER, name: 'Capstone', code: '', term: '', createdAt: '' },
  ]

  it('formats code and name, or name alone', () => {
    expect(subjectLabel(subjects, 's1')).toBe('IT 214 — Web Systems')
    expect(subjectLabel(subjects, 's2')).toBe('Capstone')
    expect(subjectLabel(subjects, null)).toBe('')
    expect(subjectLabel(subjects, 'unknown')).toBe('')
  })
})

describe('filterAndSortAcademic', () => {
  const items = [
    item({ id: 'a', title: 'Lab 5', dueDate: '2026-10-28', status: 'in_progress', progress: 40, subjectId: 's1', kind: 'assignment', priority: 'high' }),
    item({ id: 'b', title: 'Unit exam', dueDate: '2026-10-20', kind: 'exam', priority: 'high' }), // overdue
    item({ id: 'c', title: 'No deadline', subjectId: 's1', description: 'research notes' }),
    item({ id: 'd', title: 'Old lab', dueDate: '2026-10-10', status: 'completed', progress: 100 }),
  ]

  const options = { view: 'upcoming' as const, kind: 'all' as const, subjectId: 'all' as const, search: '' }

  it('upcoming excludes completed, sorts overdue first, undated last', () => {
    const result = filterAndSortAcademic(items, options)
    expect(result.map((entry) => entry.id)).toEqual(['b', 'a', 'c'])
  })

  it('completed view shows only completed items', () => {
    const result = filterAndSortAcademic(items, { ...options, view: 'completed' })
    expect(result.map((entry) => entry.id)).toEqual(['d'])
  })

  it('all view shows everything', () => {
    expect(filterAndSortAcademic(items, { ...options, view: 'all' })).toHaveLength(4)
  })

  it('filters by kind and subject', () => {
    expect(filterAndSortAcademic(items, { ...options, kind: 'exam' }).map((e) => e.id)).toEqual(['b'])
    expect(filterAndSortAcademic(items, { ...options, subjectId: 's1' }).map((e) => e.id)).toEqual(['a', 'c'])
  })

  it('searches titles and descriptions', () => {
    // Only 'Lab 5' matches under the default upcoming view (Old lab is completed).
    expect(filterAndSortAcademic(items, { ...options, search: 'LAB' }).map((e) => e.id)).toEqual(['a'])
    expect(filterAndSortAcademic(items, { ...options, search: 'research' }).map((e) => e.id)).toEqual(['c'])
    expect(filterAndSortAcademic(items, { ...options, view: 'all', search: 'lab' }).map((e) => e.id)).toEqual(['d', 'a'])
  })
})

describe('academicStats', () => {
  it('counts totals, overdue, kinds, and open progress', () => {
    const stats = academicStats(
      [
        item({ id: 'a', kind: 'assignment', dueDate: '2026-10-20', status: 'in_progress', progress: 40 }), // overdue
        item({ id: 'b', kind: 'exam', dueDate: '2026-11-01' }),
        item({ id: 'c', kind: 'exam', dueDate: '2026-11-05', status: 'completed', progress: 100 }),
        item({ id: 'd', kind: 'milestone', status: 'in_progress', progress: 60 }),
      ],
      NOW,
    )
    expect(stats).toMatchObject({
      total: 4,
      open: 3,
      completed: 1,
      overdue: 1,
      byKind: { assignment: 1, exam: 2, milestone: 1 },
      averageProgress: 33, // round((40 + 0 + 60) / 3)
    })
  })

  it('handles an empty planner', () => {
    expect(academicStats([], NOW)).toMatchObject({ total: 0, averageProgress: 0 })
  })
})

describe('monthCells', () => {
  it('builds a Monday-first 42-cell grid around October 2026', () => {
    const cells = monthCells(new Date(2026, 9, 24))
    expect(cells).toHaveLength(42)
    expect(cells[0].isoDate).toBe('2026-09-28') // Monday before Oct 1 (Thursday)
    expect(cells[41].isoDate).toBe('2026-11-08')
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31)
    expect(cells[3].isoDate).toBe('2026-10-01')
    expect(cells[3].day).toBe(1)
    expect(cells[3].inMonth).toBe(true)
  })
})

describe('groupByDueDate', () => {
  it('groups dated items and skips undated ones', () => {
    const groups = groupByDueDate([
      item({ id: 'a', dueDate: '2026-10-28' }),
      item({ id: 'b', dueDate: '2026-10-28' }),
      item({ id: 'c', dueDate: null }),
    ])
    expect(groups.get('2026-10-28')?.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(groups.size).toBe(1)
  })
})
