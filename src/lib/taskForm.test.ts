import { describe, expect, it } from 'vitest'
import {
  emptyTaskValues,
  hasFormErrors,
  normalizeTaskValues,
  taskToFormValues,
  validateTaskForm,
} from './taskForm'

describe('validateTaskForm', () => {
  it('accepts a reasonable task', () => {
    const errors = validateTaskForm({
      title: 'Finish lab report',
      description: 'Sections 3 and 4',
      priority: 'high',
      dueDate: '2026-11-01',
      category: 'Academic',
    })
    expect(hasFormErrors(errors)).toBe(false)
  })

  it('requires a title', () => {
    expect(validateTaskForm({ ...emptyTaskValues(), title: '' }).title).toBe(
      'Enter a title for the task.',
    )
    expect(validateTaskForm({ ...emptyTaskValues(), title: '   ' }).title).toBeDefined()
  })

  it('caps the title and category lengths', () => {
    expect(validateTaskForm({ ...emptyTaskValues(), title: 'x'.repeat(161) }).title).toContain(
      '160',
    )
    expect(
      validateTaskForm({ ...emptyTaskValues(), category: 'c'.repeat(61) }).category,
    ).toContain('60')
    expect(
      hasFormErrors(
        validateTaskForm({ ...emptyTaskValues(), title: 'x'.repeat(160), category: 'c'.repeat(60) }),
      ),
    ).toBe(false)
  })

  it('rejects impossible calendar dates but accepts empty', () => {
    expect(validateTaskForm({ ...emptyTaskValues(), dueDate: '2026-02-30' }).dueDate).toBeDefined()
    expect(validateTaskForm({ ...emptyTaskValues(), dueDate: 'not-a-date' }).dueDate).toBeDefined()
    expect(validateTaskForm({ ...emptyTaskValues(), dueDate: '' }).dueDate).toBeUndefined()
    expect(validateTaskForm({ ...emptyTaskValues(), dueDate: '2028-02-29' }).dueDate).toBeUndefined()
  })
})

describe('normalizeTaskValues', () => {
  it('trims fields, nulls an empty date, and defaults the category', () => {
    expect(
      normalizeTaskValues({
        title: '  Pay rent  ',
        description: '  transfer  ',
        priority: 'low',
        dueDate: '',
        category: '   ',
      }),
    ).toEqual({
      title: 'Pay rent',
      description: 'transfer',
      priority: 'low',
      dueDate: null,
      category: 'General',
    })
  })

  it('keeps a provided date and category', () => {
    const normalized = normalizeTaskValues({
      title: 'T',
      description: '',
      priority: 'medium',
      dueDate: '2026-11-01',
      category: ' Personal ',
    })
    expect(normalized.dueDate).toBe('2026-11-01')
    expect(normalized.category).toBe('Personal')
  })
})

describe('taskToFormValues', () => {
  it('round-trips an existing task into form state', () => {
    const values = taskToFormValues({
      id: 't1',
      userId: 'u1',
      title: 'Old task',
      description: null,
      priority: 'high',
      status: 'pending',
      dueDate: '2026-10-30',
      category: 'Work',
      subjectId: null,
      academicItemId: null,
      completedAt: null,
      createdAt: '2026-10-01T00:00:00.000Z',
    })

    expect(values).toEqual({
      title: 'Old task',
      description: '',
      priority: 'high',
      dueDate: '2026-10-30',
      category: 'Work',
    })
  })
})
