import type { Note } from '../types'
import { normalizeNoteValues, type NoteFormValues } from '../lib/notes'
import { useCollection } from './useCollection'

export interface UseNotesResult {
  notes: Note[]
  loading: boolean
  error: string | null
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  createNote: (values: NoteFormValues) => Promise<void>
  updateNote: (id: string, values: NoteFormValues) => Promise<void>
  setNotePinned: (id: string, pinned: boolean) => Promise<void>
  removeNote: (id: string) => Promise<void>
}

/**
 * Notes, live from Firestore. New notes start unpinned; the form never
 * touches `pinned`, so editing a note keeps its pin state.
 */
export function useNotes(): UseNotesResult {
  const { rows, loading, error, readOnly, source, reload, create, update, remove } =
    useCollection<Note>('notes')

  async function createNote(values: NoteFormValues): Promise<void> {
    await create({ ...normalizeNoteValues(values), pinned: false })
  }

  async function updateNote(id: string, values: NoteFormValues): Promise<void> {
    await update(id, normalizeNoteValues(values))
  }

  async function setNotePinned(id: string, pinned: boolean): Promise<void> {
    await update(id, { pinned })
  }

  async function removeNote(id: string): Promise<void> {
    await remove(id)
  }

  return {
    notes: rows,
    loading,
    error,
    readOnly,
    source,
    reload,
    createNote,
    updateNote,
    setNotePinned,
    removeNote,
  }
}
