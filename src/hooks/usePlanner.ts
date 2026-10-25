import type { AcademicItem, Subject } from '../types'
import {
  emptyAcademicValues,
  emptySubjectValues,
  normalizeAcademicValues,
  normalizeSubjectValues,
  type AcademicFormValues,
  type SubjectFormValues,
} from '../lib/academic'
import { useCollection } from './useCollection'

export interface UsePlannerResult {
  subjects: Subject[]
  items: AcademicItem[]
  loading: boolean
  error: string | null
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  createSubject: (values: SubjectFormValues) => Promise<void>
  updateSubject: (id: string, values: SubjectFormValues) => Promise<void>
  /** Deletes the subject and detaches its academic items (no dangling ids). */
  removeSubject: (id: string) => Promise<void>
  createItem: (values: AcademicFormValues) => Promise<void>
  updateItem: (id: string, values: AcademicFormValues) => Promise<void>
  removeItem: (id: string) => Promise<void>
}

/**
 * Subjects and academic items (assignments, exams, milestones), live from
 * Firestore through `useCollection`. Form validation lives in the dialogs
 * (they show field errors); this hook normalizes and persists.
 *
 * Deleting a subject first clears it from every item that referenced it, so
 * the planner never shows a dangling subject id.
 */
export function usePlanner(): UsePlannerResult {
  const subjectsCollection = useCollection<Subject>('subjects')
  const itemsCollection = useCollection<AcademicItem>('academicItems')

  async function createSubject(values: SubjectFormValues): Promise<void> {
    await subjectsCollection.create({ ...normalizeSubjectValues(values) })
  }

  async function updateSubject(id: string, values: SubjectFormValues): Promise<void> {
    await subjectsCollection.update(id, normalizeSubjectValues(values))
  }

  async function removeSubject(id: string): Promise<void> {
    const linked = itemsCollection.rows.filter((item) => item.subjectId === id)
    await Promise.all(linked.map((item) => itemsCollection.update(item.id, { subjectId: null })))
    await subjectsCollection.remove(id)
  }

  async function createItem(values: AcademicFormValues): Promise<void> {
    await itemsCollection.create({ ...normalizeAcademicValues(values) })
  }

  async function updateItem(id: string, values: AcademicFormValues): Promise<void> {
    await itemsCollection.update(id, normalizeAcademicValues(values))
  }

  async function removeItem(id: string): Promise<void> {
    await itemsCollection.remove(id)
  }

  return {
    subjects: subjectsCollection.rows,
    items: itemsCollection.rows,
    loading: subjectsCollection.loading || itemsCollection.loading,
    error: subjectsCollection.error ?? itemsCollection.error,
    readOnly: subjectsCollection.readOnly,
    source: subjectsCollection.source,
    reload: () => {
      subjectsCollection.reload()
      itemsCollection.reload()
    },
    createSubject,
    updateSubject,
    removeSubject,
    createItem,
    updateItem,
    removeItem,
  }
}

// Re-exported so pages can seed their forms without importing lib/academic twice.
export { emptyAcademicValues, emptySubjectValues }
