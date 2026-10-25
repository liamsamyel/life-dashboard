/**
 * Domain types shared across the app.
 *
 * These mirror the Firestore data model documented in `firestore.rules` and
 * the README. Dates that represent a
 * calendar day (due dates, habit days, transaction days) are ISO strings in
 * `YYYY-MM-DD` form; timestamps are ISO 8601 strings.
 */

export type ThemeSetting = 'dark' | 'light' | 'system'

export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'

export type Priority = 'low' | 'medium' | 'high'

export type TaskStatus = 'pending' | 'completed'

export type AcademicItemKind = 'assignment' | 'exam' | 'milestone'

export type ItemStatus = 'not_started' | 'in_progress' | 'completed'

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived'

export type HabitFrequency = 'daily' | 'weekly'

export type StudySessionStatus = 'running' | 'paused' | 'completed' | 'cancelled'

export type TransactionType = 'income' | 'expense'

export interface Profile {
  id: string
  displayName: string
  /** Recipient for the deadline digest email (defaults to the sign-in email). */
  email: string
  /** Whether the daily deadline digest email is enabled. */
  notifyEmail: boolean
  /** Days before a deadline to include it in the digest (1–14). */
  deadlineLeadDays: number
  theme: ThemeSetting
  timeZone: string
  dateFormat: DateFormat
  createdAt: string
}

export interface Subject {
  id: string
  userId: string
  name: string
  code: string
  term: string
  createdAt: string
}

export interface Task {
  id: string
  userId: string
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  /** `YYYY-MM-DD`, null when the task has no due date. */
  dueDate: string | null
  category: string
  subjectId: string | null
  academicItemId: string | null
  completedAt: string | null
  createdAt: string
}

export interface Project {
  id: string
  userId: string
  subjectId: string | null
  name: string
  description: string | null
  status: ProjectStatus
  priority: Priority
  /** `YYYY-MM-DD` target completion date. */
  dueDate: string | null
  createdAt: string
}

export interface AcademicItem {
  id: string
  userId: string
  subjectId: string | null
  projectId: string | null
  kind: AcademicItemKind
  title: string
  description: string | null
  /** `YYYY-MM-DD` deadline. */
  dueDate: string | null
  priority: Priority
  status: ItemStatus
  /** 0–100 completion percentage for milestones and projects. */
  progress: number
  createdAt: string
  updatedAt: string
}

export interface Habit {
  id: string
  userId: string
  name: string
  frequency: HabitFrequency
  /** For weekly habits: how many times per week to aim for. */
  targetPerPeriod: number
  archived: boolean
  createdAt: string
}

export interface HabitCompletion {
  id: string
  userId: string
  habitId: string
  /** `YYYY-MM-DD`. Unique per (habitId, completedOn) in the database. */
  completedOn: string
  createdAt: string
}

export interface StudySession {
  id: string
  userId: string
  subjectId: string | null
  projectId: string | null
  startedAt: string
  endedAt: string | null
  /** Legacy field: pauses are modeled by `segmentStartedAt` instead. */
  pausedSeconds: number
  /**
   * When the current running segment began (null while paused or finished).
   * Timer model: `durationSeconds` banks time from finished segments, so
   * elapsed = durationSeconds + (now − segmentStartedAt) while running.
   */
  segmentStartedAt?: string | null
  /** Banked seconds so far; final recorded length once completed. */
  durationSeconds: number
  status: StudySessionStatus
  note: string | null
}

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  /** PHP amount, always positive; `type` determines direction. */
  amount: number
  category: string
  description: string | null
  /** `YYYY-MM-DD`. */
  transactionOn: string
  createdAt: string
}

export interface MonthlyBudget {
  id: string
  userId: string
  /** First day of the month, `YYYY-MM-01`. */
  month: string
  amount: number
}

export interface Note {
  id: string
  userId: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface Bookmark {
  id: string
  userId: string
  title: string
  url: string
  category: string | null
  description: string | null
  createdAt: string
}

/** Everything the dashboard needs in one payload. */
export interface DashboardData {
  profile: Profile
  subjects: Subject[]
  tasks: Task[]
  projects: Project[]
  academicItems: AcademicItem[]
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  studySessions: StudySession[]
  transactions: Transaction[]
  budget: MonthlyBudget
  notes: Note[]
  bookmarks: Bookmark[]
}
