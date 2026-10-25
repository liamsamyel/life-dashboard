import type { Bookmark } from '../types'
import { normalizeBookmarkValues, type BookmarkFormValues } from '../lib/bookmarks'
import { useCollection } from './useCollection'

export interface UseBookmarksResult {
  bookmarks: Bookmark[]
  loading: boolean
  error: string | null
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  createBookmark: (values: BookmarkFormValues) => Promise<void>
  updateBookmark: (id: string, values: BookmarkFormValues) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
}

/**
 * Bookmarks, live from Firestore. Every URL is normalized to an absolute
 * http(s) address before it is stored, so links always open safely
 * (`target="_blank"` + `rel="noopener noreferrer"` in the UI).
 */
export function useBookmarks(): UseBookmarksResult {
  const { rows, loading, error, readOnly, source, reload, create, update, remove } =
    useCollection<Bookmark>('bookmarks')

  async function createBookmark(values: BookmarkFormValues): Promise<void> {
    await create(normalizeBookmarkValues(values))
  }

  async function updateBookmark(id: string, values: BookmarkFormValues): Promise<void> {
    await update(id, normalizeBookmarkValues(values))
  }

  async function removeBookmark(id: string): Promise<void> {
    await remove(id)
  }

  return {
    bookmarks: rows,
    loading,
    error,
    readOnly,
    source,
    reload,
    createBookmark,
    updateBookmark,
    removeBookmark,
  }
}
