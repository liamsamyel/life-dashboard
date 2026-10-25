import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { buildSampleData } from '../data/sample'
import {
  createRecord,
  deleteRecord,
  setRecord,
  toDataError,
  updateRecord,
  type CollectionKey,
} from '../lib/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'

export interface UseCollectionResult<T> {
  rows: T[]
  loading: boolean
  error: string | null
  /** Sample-data mode: readable, but writes are unavailable. */
  readOnly: boolean
  source: 'sample' | 'firestore'
  reload: () => void
  /** Create a document (auto id). Stamps userId + timestamps. */
  create: (data: Record<string, unknown>) => Promise<string>
  /** Create-or-overwrite a document with a caller-chosen id. */
  set: (id: string, data: Record<string, unknown>) => Promise<void>
  update: (id: string, patch: Record<string, unknown>) => Promise<void>
  remove: (id: string) => Promise<void>
}

function sampleRowsFor<T>(key: CollectionKey): T[] {
  const data = buildSampleData() as unknown as Record<string, unknown>
  const rows = data[key]
  if (Array.isArray(rows)) return rows as T[]
  // The dashboard payload stores the budget singly; surface it as one row.
  if (key === 'budgets' && data.budget) return [data.budget] as T[]
  return []
}

/**
 * One generic live-collection hook instead of one per feature: subscribes to
 * a Firestore collection scoped by `userId` (required by `firestore.rules`),
 * streams changes through `onSnapshot`, and exposes stamped write helpers.
 * When Firebase isn't configured, it returns read-only sample data so pages
 * still render during local development.
 */
export function useCollection<T>(key: CollectionKey): UseCollectionResult<T> {
  const { status, user } = useAuth()
  const uid = user?.uid ?? null
  const signedIn = status === 'signedIn' && uid !== null

  const [remote, setRemote] = useState<T[]>([])
  const [loading, setLoading] = useState(() => signedIn)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [sample] = useState(() => sampleRowsFor<T>(key))

  useEffect(() => {
    if (!signedIn || !uid || !db) {
      setRemote([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const rowsQuery = query(collection(db, key), where('userId', '==', uid))
    const unsubscribe = onSnapshot(
      rowsQuery,
      (snapshot) => {
        setRemote(
          snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as object) }) as T),
        )
        setLoading(false)
      },
      (snapshotError) => {
        setError(toDataError(snapshotError).message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [signedIn, uid, key, attempt])

  const reload = (): void => setAttempt((value) => value + 1)

  async function create(data: Record<string, unknown>): Promise<string> {
    if (!uid) throw new Error('Sign in to save changes.')
    return createRecord(key, data, uid)
  }

  async function set(id: string, data: Record<string, unknown>): Promise<void> {
    if (!uid) throw new Error('Sign in to save changes.')
    await setRecord(key, id, data, uid)
  }

  async function update(id: string, patch: Record<string, unknown>): Promise<void> {
    if (!uid) throw new Error('Sign in to save changes.')
    await updateRecord(key, id, patch)
  }

  async function remove(id: string): Promise<void> {
    if (!uid) throw new Error('Sign in to delete records.')
    await deleteRecord(key, id)
  }

  if (!signedIn) {
    return {
      rows: sample,
      loading: false,
      error: null,
      readOnly: true,
      source: 'sample',
      reload,
      create,
      set,
      update,
      remove,
    }
  }

  return {
    rows: remote,
    loading,
    error,
    readOnly: false,
    source: 'firestore',
    reload,
    create,
    set,
    update,
    remove,
  }
}
