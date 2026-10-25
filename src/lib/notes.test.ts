import { describe, expect, it } from 'vitest'
import type { Note } from '../types'
import {
  allTags,
  emptyNoteValues,
  filterAndSortNotes,
  normalizeNoteValues,
  noteExcerpt,
  noteToFormValues,
  parseTags,
  validateNoteForm,
} from './notes'

const USER = 'user-1'

function note(overrides: Partial<Note> & Pick<Note, 'id'>): Note {
  return {
    userId: USER,
    title: 'Title',
    content: 'Body',
    tags: [],
    pinned: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('parseTags', () => {
  it('splits, trims, drops blanks, and de-duplicates', () => {
    expect(parseTags(' school, security ,, ')).toEqual(['school', 'security'])
    expect(parseTags('School, school')).toEqual(['School'])
    expect(parseTags('')).toEqual([])
  })
})

describe('note form', () => {
  it('requires a title', () => {
    expect(validateNoteForm(emptyNoteValues()).title).toBe('Enter a title for the note.')
  })

  it('rejects too many or too long tags', () => {
    const many = Array.from({ length: 13 }, (_, index) => `tag${index}`).join(', ')
    expect(validateNoteForm({ title: 'Ideas', content: '', tags: many }).tags).toBe(
      'Use at most 12 tags.',
    )
    const long = 'x'.repeat(25)
    expect(validateNoteForm({ title: 'Ideas', content: '', tags: long }).tags).toBe(
      'Keep each tag to 24 characters or fewer.',
    )
  })

  it('accepts a valid note and normalizes it for storage', () => {
    const values = { title: '  Lab 5 ideas  ', content: '  Rules first.  ', tags: ' school, school ' }
    expect(validateNoteForm(values)).toEqual({})
    expect(normalizeNoteValues(values)).toEqual({
      title: 'Lab 5 ideas',
      content: 'Rules first.',
      tags: ['school'],
    })
  })

  it('round-trips a stored note into form values', () => {
    const values = noteToFormValues(note({ id: 'n1', tags: ['a', 'b'], title: 'T' }))
    expect(values.tags).toBe('a, b')
    expect(values.title).toBe('T')
  })
})

describe('noteExcerpt', () => {
  it('collapses whitespace and placeholder-fills empty notes', () => {
    expect(noteExcerpt('  one\n\n two  ')).toBe('one two')
    expect(noteExcerpt('   ')).toBe('No content yet')
  })

  it('truncates long content with an ellipsis at the requested length', () => {
    const excerpt = noteExcerpt('a'.repeat(50), 10)
    expect(excerpt).toBe('aaaaaaaaa…')
    expect(excerpt).toHaveLength(10)
  })
})

describe('allTags', () => {
  it('collects unique tags, sorted', () => {
    const notes = [
      note({ id: 'a', tags: ['school', 'security'] }),
      note({ id: 'b', tags: ['money', 'school'] }),
      note({ id: 'c', tags: [] }),
    ]
    expect(allTags(notes)).toEqual(['money', 'school', 'security'])
    expect(allTags([])).toEqual([])
  })
})

describe('filterAndSortNotes', () => {
  const notes = [
    note({ id: 'old', title: 'Budget check-in', content: 'Transport crept up', tags: ['money'], updatedAt: '2026-10-05T08:00:00.000Z' }),
    note({ id: 'pinned', title: 'Lab 5 ideas', content: 'Rules per collection', tags: ['school', 'security'], pinned: true, updatedAt: '2026-10-01T08:00:00.000Z' }),
    note({ id: 'recent', title: 'References', content: 'STRIDE then OWASP', tags: ['reading'], updatedAt: '2026-10-20T08:00:00.000Z' }),
  ]

  it('puts pinned notes first, then most recently edited', () => {
    const ordered = filterAndSortNotes(notes, { search: '', tag: 'all' })
    expect(ordered.map((entry) => entry.id)).toEqual(['pinned', 'recent', 'old'])
  })

  it('searches titles, bodies, and tags', () => {
    const byTitle = filterAndSortNotes(notes, { search: 'budget', tag: 'all' })
    expect(byTitle.map((entry) => entry.id)).toEqual(['old'])

    const byBody = filterAndSortNotes(notes, { search: 'owasp', tag: 'all' })
    expect(byBody.map((entry) => entry.id)).toEqual(['recent'])

    const byTag = filterAndSortNotes(notes, { search: 'security', tag: 'all' })
    expect(byTag.map((entry) => entry.id)).toEqual(['pinned'])
  })

  it('filters by an exact tag', () => {
    expect(
      filterAndSortNotes(notes, { search: '', tag: 'money' }).map((entry) => entry.id),
    ).toEqual(['old'])
    expect(filterAndSortNotes(notes, { search: '', tag: 'missing' })).toEqual([])
  })
})
