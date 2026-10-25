import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { Bill, DashboardData, MonthlyBudget, Profile } from '../types'
import { toISODate } from './dates'
import { dataErrorMessage, errorCodeOf } from './errors'
import { db } from './firebase'

/**
 * Firestore data access.
 *
 * Every query filters by `userId`, which both matches the security rules in
 * `firestore.rules` (unfiltered queries are rejected outright) and keeps
 * reads scoped to the signed-in user. Sorting and filtering happen client
 * side in `lib/derive.ts` — personal-scale data, automatic single-field
 * indexes, no composite indexes needed.
 *
 * Timestamps are stored as ISO-8601 strings so documents map 1:1 onto the
 * TypeScript types in `src/types/index.ts`.
 */

export type CollectionKey =
  | 'subjects'
  | 'projects'
  | 'academicItems'
  | 'tasks'
  | 'habits'
  | 'habitCompletions'
  | 'studySessions'
  | 'transactions'
  | 'bills'
  | 'budgets'
  | 'notes'
  | 'bookmarks'

function requireDb(): Firestore {
  if (!db) throw new Error('Firebase is not configured yet — fill in .env first.')
  return db
}

/** Wrap a Firestore error so the UI can show a message a person can act on. */
export function toDataError(error: unknown): Error {
  return new Error(dataErrorMessage(errorCodeOf(error)))
}

async function listForUser<T>(database: Firestore, name: CollectionKey, uid: string): Promise<T[]> {
  const snapshot = await getDocs(query(collection(database, name), where('userId', '==', uid)))
  return snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as object) }) as T)
}

function currentMonthId(): string {
  return `${toISODate(new Date()).slice(0, 7)}-01`
}

/** A brand-new profile, seeded from the auth account. */
function profileDefaults(uid: string, overrides: Partial<Profile> = {}): Profile {
  return {
    id: uid,
    displayName: '',
    email: '',
    notifyEmail: true,
    deadlineLeadDays: 3,
    theme: 'dark',
    timeZone: 'Asia/Manila',
    dateFormat: 'YYYY-MM-DD',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Read everything the dashboard needs for one user in parallel.
 * If the profile document doesn't exist yet (first sign-in), it is created
 * with defaults; a missing budget for the current month yields a ₱0 budget
 * so the widget renders an honest empty state instead of failing.
 */
export async function fetchAllUserData(user: {
  uid: string
  displayName: string | null
  email: string | null
}): Promise<DashboardData> {
  const database = requireDb()

  try {
    const [
      profileSnapshot,
      subjects,
      projects,
      academicItems,
      tasks,
      habits,
      habitCompletions,
      studySessions,
      transactions,
      bills,
      budgets,
      notes,
      bookmarks,
    ] = await Promise.all([
      getDoc(doc(database, 'users', user.uid)),
      listForUser<DashboardData['subjects'][number]>(database, 'subjects', user.uid),
      listForUser<DashboardData['projects'][number]>(database, 'projects', user.uid),
      listForUser<DashboardData['academicItems'][number]>(database, 'academicItems', user.uid),
      listForUser<DashboardData['tasks'][number]>(database, 'tasks', user.uid),
      listForUser<DashboardData['habits'][number]>(database, 'habits', user.uid),
      listForUser<DashboardData['habitCompletions'][number]>(database, 'habitCompletions', user.uid),
      listForUser<DashboardData['studySessions'][number]>(database, 'studySessions', user.uid),
      listForUser<DashboardData['transactions'][number]>(database, 'transactions', user.uid),
      listForUser<Bill>(database, 'bills', user.uid),
      listForUser<MonthlyBudget>(database, 'budgets', user.uid),
      listForUser<DashboardData['notes'][number]>(database, 'notes', user.uid),
      listForUser<DashboardData['bookmarks'][number]>(database, 'bookmarks', user.uid),
    ])

    let profile: Profile
    if (profileSnapshot.exists()) {
      const stored = profileSnapshot.data() as Partial<Profile>
      // Documents created by an older build lack the notification fields;
      // merge in defaults so the app and the digest function always see them.
      const patch: Partial<Profile> = {}
      if (typeof stored.email !== 'string') patch.email = user.email ?? ''
      if (typeof stored.notifyEmail !== 'boolean') patch.notifyEmail = true
      if (typeof stored.deadlineLeadDays !== 'number') patch.deadlineLeadDays = 3

      // Self-heal: if the profile was created before the display name landed
      // (sign-up race), backfill it from the auth user on the next load.
      const authName = user.displayName?.trim() ?? ''
      if (!stored.displayName?.trim() && authName) patch.displayName = authName

      profile = { ...profileDefaults(user.uid), ...stored, ...patch, id: user.uid }
      if (Object.keys(patch).length > 0) {
        await setDoc(doc(database, 'users', user.uid), patch, { merge: true })
      }
    } else {
      profile = profileDefaults(user.uid)
      await setDoc(doc(database, 'users', user.uid), profile)
    }

    const month = currentMonthId()
    const budget = budgets.find((entry) => entry.month === month) ?? {
      id: 'unset-budget',
      userId: user.uid,
      month,
      amount: 0,
    }

    return {
      profile,
      subjects,
      projects,
      academicItems,
      tasks,
      habits,
      habitCompletions,
      studySessions,
      transactions,
      bills,
      budget,
      notes,
      bookmarks,
    }
  } catch (error) {
    throw toDataError(error)
  }
}

/** Read the signed-in user's profile document (null if not created yet). */
export async function loadProfile(uid: string): Promise<Profile | null> {
  const database = requireDb()
  try {
    const snapshot = await getDoc(doc(database, 'users', uid))
    return snapshot.exists()
      ? ({ id: snapshot.id, ...(snapshot.data() as object) } as Profile)
      : null
  } catch (error) {
    throw toDataError(error)
  }
}

/**
 * Create-or-update the profile with a partial patch (merging). Returns the
 * resulting document so callers can update their state without a refetch.
 */
export async function saveProfile(uid: string, patch: Partial<Profile>): Promise<Profile> {
  const database = requireDb()
  try {
    const reference = doc(database, 'users', uid)
    const existing = await getDoc(reference)

    if (existing.exists()) {
      await setDoc(reference, patch, { merge: true })
      return { ...(existing.data() as object), ...patch, id: uid } as Profile
    }

    const created: Profile = profileDefaults(uid, patch)
    await setDoc(reference, created)
    return created
  } catch (error) {
    throw toDataError(error)
  }
}

/**
 * Write primitives for the feature stages (task CRUD starts at stage 3).
 * `userId` and timestamps are stamped server-of-truth style here so callers
 * can never forget them — the rules reject documents without a matching
 * `userId`.
 */
export async function createRecord(
  name: CollectionKey,
  data: Record<string, unknown>,
  uid: string,
): Promise<string> {
  const database = requireDb()
  try {
    const now = new Date().toISOString()
    const reference = await addDoc(collection(database, name), {
      ...data,
      userId: uid,
      createdAt: now,
      updatedAt: now,
    })
    return reference.id
  } catch (error) {
    throw toDataError(error)
  }
}

/**
 * Write a document with a caller-chosen id — used where uniqueness matters.
 * Habit completions use `${habitId}_${YYYY-MM-DD}` so a habit can be marked
 * at most once per day: Firestore has no UNIQUE constraint, so same-id writes
 * converge instead of stacking (see `firestore.rules`). Overwrites if the
 * document exists; callers guard with a read first where rules forbid updates.
 */
export async function setRecord(
  name: CollectionKey,
  id: string,
  data: Record<string, unknown>,
  uid: string,
): Promise<void> {
  const database = requireDb()
  try {
    const now = new Date().toISOString()
    await setDoc(doc(database, name, id), {
      ...data,
      userId: uid,
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    throw toDataError(error)
  }
}

export async function updateRecord(
  name: CollectionKey,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const database = requireDb()
  try {
    await updateDoc(doc(database, name, id), { ...patch, updatedAt: new Date().toISOString() })
  } catch (error) {
    throw toDataError(error)
  }
}

export async function deleteRecord(name: CollectionKey, id: string): Promise<void> {
  const database = requireDb()
  try {
    await deleteDoc(doc(database, name, id))
  } catch (error) {
    throw toDataError(error)
  }
}
