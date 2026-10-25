import type { Note } from '../types'

/**
 * Pure notes logic: the create/edit form, tag parsing, excerpts, and list
 * search/filtering. Notes are sorted pinned-first, then by most recent edit —
 * the order the dashboard's "Recent notes" widget uses too.
 */

export const NOTE_TITLE_MAX = 160
export const NOTE_CONTENT_MAX = 20000
export const NOTE_TAGS_MAX = 12
export const NOTE_TAG_MAX = 24

/** Values handled by the note create/edit form (strings from inputs). */
export interface NoteFormValues {
  title: string
  content: string
  /** Comma-separated tags, e.g. `school, security`. */
  tags: string
}

export type NoteFormErrors = Partial<Record<'title' | 'content' | 'tags', string>>

export function emptyNoteValues(): NoteFormValues {
  return { title: '', content: '', tags: '' }
}

export function noteToFormValues(note: Note): NoteFormValues {
  return { title: note.title, content: note.content, tags: note.tags.join(', ') }
}

/**
 * Split typed tags on commas, trim them, drop blanks, and de-duplicate
 * case-insensitively (keeping the first spelling the user typed).
 */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const piece of raw.split(',')) {
    const tag = piece.trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }
  return tags
}

export function validateNoteForm(values: NoteFormValues): NoteFormErrors {
  const errors: NoteFormErrors = {}

  const title = values.title.trim()
  if (title.length === 0) {
    errors.title = 'Enter a title for the note.'
  } else if (title.length > NOTE_TITLE_MAX) {
    errors.title = `Keep the title to ${NOTE_TITLE_MAX} characters or fewer.`
  }

  if (values.content.length > NOTE_CONTENT_MAX) {
    errors.content = `Keep the note to ${NOTE_CONTENT_MAX} characters or fewer.`
  }

  const tags = parseTags(values.tags)
  if (tags.length > NOTE_TAGS_MAX) {
    errors.tags = `Use at most ${NOTE_TAGS_MAX} tags.`
  } else if (tags.some((tag) => tag.length > NOTE_TAG_MAX)) {
    errors.tags = `Keep each tag to ${NOTE_TAG_MAX} characters or fewer.`
  }

  return errors
}

export function hasFormErrors(errors: NoteFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Persist-ready values. `pinned` is managed separately (pin/unpin action). */
export function normalizeNoteValues(values: NoteFormValues): {
  title: string
  content: string
  tags: string[]
} {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    tags: parseTags(values.tags),
  }
}

/** One-line preview of the note body; empty notes get a neutral placeholder. */
export function noteExcerpt(content: string, max = 140): string {
  const collapsed = content.replace(/\s+/g, ' ').trim()
  if (!collapsed) return 'No content yet'
  return collapsed.length > max ? `${collapsed.slice(0, max - 1).trimEnd()}…` : collapsed
}

/** Every tag in use, sorted for the filter menu. */
export function allTags(notes: Note[]): string[] {
  const tags = new Set<string>()
  for (const note of notes) {
    for (const tag of note.tags) tags.add(tag)
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
}

export interface NoteFilterOptions {
  search: string
  /** `'all'` disables the tag filter. */
  tag: string
}

/**
 * Search titles, bodies, and tags, filter by tag, then order pinned notes
 * first and the rest by most recent edit.
 */
export function filterAndSortNotes(notes: Note[], options: NoteFilterOptions): Note[] {
  let list = notes

  if (options.tag !== 'all') {
    list = list.filter((note) => note.tags.includes(options.tag))
  }

  const search = options.search.trim().toLowerCase()
  if (search) {
    list = list.filter(
      (note) =>
        note.title.toLowerCase().includes(search) ||
        note.content.toLowerCase().includes(search) ||
        note.tags.some((tag) => tag.toLowerCase().includes(search)),
    )
  }

  return [...list].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.updatedAt.localeCompare(a.updatedAt) ||
      a.id.localeCompare(b.id),
  )
}
