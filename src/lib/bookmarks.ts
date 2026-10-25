import type { Bookmark } from '../types'

/**
 * Pure bookmark logic: the create/edit form, URL normalization and
 * validation, and list search/filtering. Only http(s) URLs are accepted, so
 * saving a `javascript:` or `data:` link (which would run in the page) is
 * rejected before it reaches the database.
 */

export const BOOKMARK_TITLE_MAX = 160
export const BOOKMARK_URL_MAX = 2048
export const BOOKMARK_CATEGORY_MAX = 60
export const BOOKMARK_DESCRIPTION_MAX = 300

/** Values handled by the bookmark create/edit form (strings from inputs). */
export interface BookmarkFormValues {
  title: string
  url: string
  category: string
  description: string
}

export type BookmarkFormErrors = Partial<
  Record<'title' | 'url' | 'category' | 'description', string>
>

export function emptyBookmarkValues(): BookmarkFormValues {
  return { title: '', url: '', category: '', description: '' }
}

export function bookmarkToFormValues(bookmark: Bookmark): BookmarkFormValues {
  return {
    title: bookmark.title,
    url: bookmark.url,
    category: bookmark.category ?? '',
    description: bookmark.description ?? '',
  }
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * Normalize a typed URL: trim it and add `https://` when no scheme was
 * given (`react.dev` → `https://react.dev/`). Unparseable input is returned
 * trimmed — validation rejects it.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(candidate).href
  } catch {
    return trimmed
  }
}

/** True for http(s) URLs with a plausible host (or localhost). */
export function isHttpUrl(raw: string): boolean {
  const normalized = normalizeUrl(raw)
  if (!normalized) return false
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    return url.hostname === 'localhost' || url.hostname.includes('.')
  } catch {
    return false
  }
}

/** Host without `www.`, for the secondary line in the list. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function validateBookmarkForm(values: BookmarkFormValues): BookmarkFormErrors {
  const errors: BookmarkFormErrors = {}

  const title = values.title.trim()
  if (title.length === 0) {
    errors.title = 'Enter a title for this bookmark.'
  } else if (title.length > BOOKMARK_TITLE_MAX) {
    errors.title = `Keep the title to ${BOOKMARK_TITLE_MAX} characters or fewer.`
  }

  const url = values.url.trim()
  if (url.length === 0) {
    errors.url = 'Enter a URL.'
  } else if (url.length > BOOKMARK_URL_MAX) {
    errors.url = 'That URL is too long.'
  } else if (!isHttpUrl(url)) {
    errors.url = 'Enter a full web address, e.g. https://react.dev.'
  }

  if (values.category.trim().length > BOOKMARK_CATEGORY_MAX) {
    errors.category = `Keep the category to ${BOOKMARK_CATEGORY_MAX} characters or fewer.`
  }
  if (values.description.trim().length > BOOKMARK_DESCRIPTION_MAX) {
    errors.description = `Keep the description to ${BOOKMARK_DESCRIPTION_MAX} characters or fewer.`
  }

  return errors
}

export function hasFormErrors(errors: BookmarkFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Persist-ready values, with the URL normalized and blanks as null. */
export function normalizeBookmarkValues(values: BookmarkFormValues): {
  title: string
  url: string
  category: string | null
  description: string | null
} {
  return {
    title: values.title.trim(),
    url: normalizeUrl(values.url),
    category: values.category.trim() || null,
    description: values.description.trim() || null,
  }
}

/** Categories in use, sorted for the filter menu. */
export function bookmarkCategories(bookmarks: Bookmark[]): string[] {
  const categories = new Set<string>()
  for (const bookmark of bookmarks) {
    if (bookmark.category) categories.add(bookmark.category)
  }
  return [...categories].sort((a, b) => a.localeCompare(b))
}

export type BookmarkSort = 'recent' | 'title'

export interface BookmarkFilterOptions {
  search: string
  /** `'all'` disables the category filter. */
  category: string
  sort: BookmarkSort
}

/** Search titles, URLs, categories and descriptions, then filter and sort. */
export function filterAndSortBookmarks(
  bookmarks: Bookmark[],
  options: BookmarkFilterOptions,
): Bookmark[] {
  let list = bookmarks

  if (options.category !== 'all') {
    list = list.filter((bookmark) => bookmark.category === options.category)
  }

  const search = options.search.trim().toLowerCase()
  if (search) {
    list = list.filter(
      (bookmark) =>
        bookmark.title.toLowerCase().includes(search) ||
        bookmark.url.toLowerCase().includes(search) ||
        (bookmark.category ?? '').toLowerCase().includes(search) ||
        (bookmark.description ?? '').toLowerCase().includes(search),
    )
  }

  const sorted = [...list]
  if (options.sort === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
  } else {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
  }
  return sorted
}
