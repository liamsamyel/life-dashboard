import { describe, expect, it } from 'vitest'
import type { Bookmark } from '../types'
import {
  bookmarkCategories,
  bookmarkToFormValues,
  emptyBookmarkValues,
  filterAndSortBookmarks,
  hasFormErrors,
  hostnameOf,
  isHttpUrl,
  normalizeBookmarkValues,
  normalizeUrl,
  validateBookmarkForm,
} from './bookmarks'

const USER = 'user-1'

function bookmark(overrides: Partial<Bookmark> & Pick<Bookmark, 'id'>): Bookmark {
  return {
    userId: USER,
    title: 'MDN',
    url: 'https://developer.mozilla.org/',
    category: 'Reference',
    description: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('normalizeUrl', () => {
  it('adds https:// when the scheme is missing', () => {
    expect(normalizeUrl('react.dev')).toBe('https://react.dev/')
    expect(normalizeUrl('  react.dev/docs  ')).toBe('https://react.dev/docs')
  })

  it('keeps an explicit scheme and canonicalizes the rest', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/')
    expect(normalizeUrl('https://example.com/a?b=1#c')).toBe('https://example.com/a?b=1#c')
  })

  it('returns an empty string for empty input', () => {
    expect(normalizeUrl('   ')).toBe('')
  })
})

describe('isHttpUrl', () => {
  it('accepts web addresses', () => {
    expect(isHttpUrl('https://react.dev')).toBe(true)
    expect(isHttpUrl('http://localhost:5173/app')).toBe(true)
    expect(isHttpUrl('example.com')).toBe(true)
  })

  it('rejects script and data URLs and nonsense', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('data:text/html,<h1>hi</h1>')).toBe(false)
    expect(isHttpUrl('hello')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
    expect(isHttpUrl('https://exa mple.com')).toBe(false)
  })
})

describe('hostnameOf', () => {
  it('strips www and survives malformed input', () => {
    expect(hostnameOf('https://www.figma.com/community')).toBe('figma.com')
    expect(hostnameOf('not a url')).toBe('not a url')
  })
})

describe('bookmark form', () => {
  it('starts empty', () => {
    expect(emptyBookmarkValues()).toEqual({ title: '', url: '', category: '', description: '' })
  })

  it('requires a title and a valid URL', () => {
    const errors = validateBookmarkForm(emptyBookmarkValues())
    expect(errors.title).toBe('Enter a title for this bookmark.')
    expect(errors.url).toBe('Enter a URL.')

    expect(
      validateBookmarkForm({ title: 'Bad', url: 'javascript:alert(1)', category: '', description: '' })
        .url,
    ).toBe('Enter a full web address, e.g. https://react.dev.')
  })

  it('accepts a valid entry and normalizes it for storage', () => {
    const values = { title: '  React  ', url: ' react.dev ', category: ' Reference ', description: '  Hooks  ' }
    expect(hasFormErrors(validateBookmarkForm(values))).toBe(false)
    expect(normalizeBookmarkValues(values)).toEqual({
      title: 'React',
      url: 'https://react.dev/',
      category: 'Reference',
      description: 'Hooks',
    })
    expect(
      normalizeBookmarkValues({ title: 'Plain', url: 'example.com', category: '', description: '' }),
    ).toEqual({ title: 'Plain', url: 'https://example.com/', category: null, description: null })
  })

  it('round-trips a stored bookmark into form values', () => {
    const values = bookmarkToFormValues(bookmark({ id: 'b1', category: null, description: 'Docs' }))
    expect(values.category).toBe('')
    expect(values.description).toBe('Docs')
  })
})

describe('bookmarkCategories', () => {
  it('lists unique non-empty categories, sorted', () => {
    const bookmarks = [
      bookmark({ id: 'a', category: 'Reference' }),
      bookmark({ id: 'b', category: 'Design' }),
      bookmark({ id: 'c', category: 'Reference' }),
      bookmark({ id: 'd', category: null }),
    ]
    expect(bookmarkCategories(bookmarks)).toEqual(['Design', 'Reference'])
  })
})

describe('filterAndSortBookmarks', () => {
  const bookmarks = [
    bookmark({ id: 'old', title: 'MDN Web Docs', url: 'https://developer.mozilla.org/', category: 'Reference', createdAt: '2026-09-01T08:00:00.000Z' }),
    bookmark({ id: 'new', title: 'Figma', url: 'https://www.figma.com/community', category: 'Design', createdAt: '2026-10-20T08:00:00.000Z' }),
    bookmark({ id: 'mid', title: 'React', url: 'https://react.dev/', category: 'Reference', description: 'Hooks', createdAt: '2026-10-01T08:00:00.000Z' }),
  ]

  it('sorts by most recently added by default', () => {
    expect(
      filterAndSortBookmarks(bookmarks, { search: '', category: 'all', sort: 'recent' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['new', 'mid', 'old'])
  })

  it('can sort by title', () => {
    expect(
      filterAndSortBookmarks(bookmarks, { search: '', category: 'all', sort: 'title' }).map(
        (entry) => entry.title,
      ),
    ).toEqual(['Figma', 'MDN Web Docs', 'React'])
  })

  it('filters by category and searches every text field', () => {
    expect(
      filterAndSortBookmarks(bookmarks, { search: '', category: 'Reference', sort: 'recent' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['mid', 'old'])

    expect(
      filterAndSortBookmarks(bookmarks, { search: 'hooks', category: 'all', sort: 'recent' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['mid'])

    expect(
      filterAndSortBookmarks(bookmarks, { search: 'figma.com', category: 'all', sort: 'recent' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['new'])
  })
})
