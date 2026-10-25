import type {
  AcademicItem,
  DashboardData,
  Habit,
  HabitCompletion,
  MonthlyBudget,
  Note,
  Bookmark,
  Profile,
  Project,
  StudySession,
  Subject,
  Task,
  Transaction,
} from '../types'
import { addDays, addMonths, startOfDay, startOfWeek, toISODate } from '../lib/dates'

/**
 * Development sample data.
 *
 * Everything here is clearly separated from real user data:
 *   * every id starts with `sample-` and `sampleUser` is never a real user,
 *   * this module is only imported by `useDashboardData` while Supabase is
 *     not wired up (stage 6),
 *   * the dashboard shows a visible "Sample data" badge while it is in use.
 *
 * Dates are generated relative to "now" so the dashboard always looks alive.
 */

export const sampleUser = 'sample-user'

const now = (): Date => new Date()

/** Local date at `hour:minute` on the day `days` away from today. */
function at(days: number, hour: number, minute = 0): Date {
  const date = addDays(startOfDay(now()), days)
  date.setHours(hour, minute, 0, 0)
  return date
}

function isoOf(date: Date): string {
  return date.toISOString()
}

function dayOffset(days: number): string {
  return toISODate(addDays(now(), days))
}

export function buildSampleData(): DashboardData {
  return {
    profile: sampleProfile,
    subjects: sampleSubjects,
    tasks: sampleTasks(),
    projects: sampleProjects,
    academicItems: sampleAcademicItems(),
    habits: sampleHabits,
    habitCompletions: sampleHabitCompletions(),
    studySessions: sampleStudySessions(),
    transactions: sampleTransactions(),
    budget: sampleBudget,
    notes: sampleNotes(),
    bookmarks: sampleBookmarks,
  }
}

const sampleProfile: Profile = {
  id: sampleUser,
  displayName: 'Miguel Santos',
  email: 'miguel.santos@example.com',
  notifyEmail: true,
  deadlineLeadDays: 3,
  theme: 'dark',
  timeZone: 'Asia/Manila',
  dateFormat: 'YYYY-MM-DD',
  createdAt: isoOf(at(-120, 9)),
}

const sampleSubjects: Subject[] = [
  { id: 'sample-subject-1', userId: sampleUser, name: 'Web Systems and Technologies', code: 'IT 214', term: '1st Sem 2026–2027', createdAt: isoOf(at(-60, 9)) },
  { id: 'sample-subject-2', userId: sampleUser, name: 'Mobile Application Development', code: 'IT 218', term: '1st Sem 2026–2027', createdAt: isoOf(at(-60, 9)) },
  { id: 'sample-subject-3', userId: sampleUser, name: 'Information Assurance and Security', code: 'IT 220', term: '1st Sem 2026–2027', createdAt: isoOf(at(-60, 9)) },
  { id: 'sample-subject-4', userId: sampleUser, name: 'Capstone Project and Research', code: 'IT 201', term: '1st Sem 2026–2027', createdAt: isoOf(at(-60, 9)) },
]

function sampleTasks(): Task[] {
  const base = { userId: sampleUser, description: null, subjectId: null, academicItemId: null, completedAt: null }
  return [
    { ...base, id: 'sample-task-1', title: 'Finish Lab 4 — Firestore data model', priority: 'high', status: 'pending', dueDate: dayOffset(-2), category: 'Academic', subjectId: 'sample-subject-1', createdAt: isoOf(at(-7, 10)) },
    { ...base, id: 'sample-task-2', title: 'Renew library books', priority: 'low', status: 'pending', dueDate: dayOffset(-1), category: 'Personal', createdAt: isoOf(at(-5, 14)) },
    { ...base, id: 'sample-task-3', title: 'Review notes for IAS quiz', priority: 'medium', status: 'pending', dueDate: dayOffset(0), category: 'Academic', subjectId: 'sample-subject-3', createdAt: isoOf(at(-3, 19)) },
    { ...base, id: 'sample-task-4', title: 'Submit weekly time log', priority: 'medium', status: 'pending', dueDate: dayOffset(0), category: 'Work', createdAt: isoOf(at(-2, 8)) },
    { ...base, id: 'sample-task-5', title: 'Grocery run for the week', priority: 'low', status: 'pending', dueDate: dayOffset(0), category: 'Personal', createdAt: isoOf(at(-1, 21)) },
    { ...base, id: 'sample-task-6', title: 'Draft Android login screen wireframe', priority: 'high', status: 'pending', dueDate: dayOffset(2), category: 'Academic', subjectId: 'sample-subject-2', createdAt: isoOf(at(-4, 13)) },
    { ...base, id: 'sample-task-7', title: 'Read chapter 5 — threat modeling', priority: 'medium', status: 'pending', dueDate: dayOffset(4), category: 'Academic', subjectId: 'sample-subject-3', createdAt: isoOf(at(-2, 16)) },
    { ...base, id: 'sample-task-8', title: 'Back up thesis drafts to cloud', priority: 'low', status: 'pending', dueDate: null, category: 'Personal', createdAt: isoOf(at(-9, 22)) },
    { ...base, id: 'sample-task-9', title: 'Pay internet bill', priority: 'high', status: 'completed', dueDate: dayOffset(-1), category: 'Personal', completedAt: isoOf(at(-1, 18)), createdAt: isoOf(at(-6, 9)) },
    { ...base, id: 'sample-task-10', title: 'Attend project scrum meeting', priority: 'medium', status: 'completed', dueDate: dayOffset(-3), category: 'Academic', subjectId: 'sample-subject-4', completedAt: isoOf(at(-3, 15)), createdAt: isoOf(at(-8, 9)) },
  ]
}

const sampleProjects: Project[] = [
  { id: 'sample-project-1', userId: sampleUser, subjectId: 'sample-subject-4', name: 'Capstone: Barangay records system', description: 'Research, build, and defend the capstone project.', status: 'active', priority: 'high', dueDate: dayOffset(30), createdAt: isoOf(at(-45, 10)) },
  { id: 'sample-project-2', userId: sampleUser, subjectId: null, name: 'Portfolio website refresh', description: 'Update case studies and deploy the new layout.', status: 'active', priority: 'low', dueDate: dayOffset(21), createdAt: isoOf(at(-20, 20)) },
]

function sampleAcademicItems(): AcademicItem[] {
  const base = { userId: sampleUser, description: '', projectId: null, updatedAt: isoOf(at(-1, 12)), createdAt: isoOf(at(-14, 12)) }
  return [
    { ...base, id: 'sample-item-1', subjectId: 'sample-subject-3', kind: 'exam', title: 'IAS unit exam 1', dueDate: dayOffset(-1), priority: 'high', status: 'not_started', progress: 0 },
    { ...base, id: 'sample-item-2', subjectId: 'sample-subject-1', kind: 'assignment', title: 'Lab 5 — auth and security rules', dueDate: dayOffset(1), priority: 'high', status: 'in_progress', progress: 40 },
    { ...base, id: 'sample-item-3', subjectId: 'sample-subject-2', kind: 'exam', title: 'Mobile dev midterm exam', dueDate: dayOffset(5), priority: 'high', status: 'not_started', progress: 0 },
    { ...base, id: 'sample-item-4', subjectId: null, projectId: 'sample-project-1', kind: 'milestone', title: 'Capstone chapter 2 outline', dueDate: dayOffset(8), priority: 'medium', status: 'in_progress', progress: 25 },
    { ...base, id: 'sample-item-5', subjectId: 'sample-subject-4', kind: 'assignment', title: 'Annotated bibliography (5 sources)', dueDate: dayOffset(12), priority: 'medium', status: 'not_started', progress: 0 },
    { ...base, id: 'sample-item-6', subjectId: 'sample-subject-1', kind: 'assignment', title: 'Lab 3 — responsive layout', dueDate: dayOffset(-6), priority: 'medium', status: 'completed', progress: 100 },
  ]
}

const sampleHabits: Habit[] = [
  { id: 'sample-habit-1', userId: sampleUser, name: 'Drink 2L of water', frequency: 'daily', targetPerPeriod: 1, archived: false, createdAt: isoOf(at(-40, 7)) },
  { id: 'sample-habit-2', userId: sampleUser, name: 'Read for 30 minutes', frequency: 'daily', targetPerPeriod: 1, archived: false, createdAt: isoOf(at(-40, 7)) },
  { id: 'sample-habit-3', userId: sampleUser, name: 'Work out', frequency: 'daily', targetPerPeriod: 1, archived: false, createdAt: isoOf(at(-40, 7)) },
  { id: 'sample-habit-4', userId: sampleUser, name: 'Review class notes', frequency: 'daily', targetPerPeriod: 1, archived: false, createdAt: isoOf(at(-40, 7)) },
  { id: 'sample-habit-5', userId: sampleUser, name: 'Plan the week', frequency: 'weekly', targetPerPeriod: 1, archived: false, createdAt: isoOf(at(-40, 7)) },
]

/**
 * Deterministic completion history for the last 30 days: every habit is done
 * except on days where (day index + habit index) is a multiple of 4, plus the
 * first two habits are done today. No randomness, so the UI is stable.
 */
function sampleHabitCompletions(): HabitCompletion[] {
  const completions: HabitCompletion[] = []
  let counter = 0

  for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
    const date = addDays(startOfDay(now()), -daysAgo)
    const dayIndex = 30 - daysAgo
    sampleHabits.forEach((habit, habitIndex) => {
      if ((dayIndex + habitIndex) % 4 === 0) return
      if (habit.frequency === 'weekly' && dayIndex % 7 !== 0) return
      counter += 1
      completions.push({
        id: `sample-completion-${counter}`,
        userId: sampleUser,
        habitId: habit.id,
        completedOn: toISODate(date),
        createdAt: isoOf(date),
      })
    })
  }

  // Today: first two habits done so the widget shows partial progress.
  for (const habit of sampleHabits.slice(0, 2)) {
    counter += 1
    completions.push({
      id: `sample-completion-${counter}`,
      userId: sampleUser,
      habitId: habit.id,
      completedOn: toISODate(now()),
      createdAt: isoOf(at(0, 8)),
    })
  }

  return completions
}

/**
 * Study sessions from Monday of the current week up to today, so the weekly
 * chart always has data but never shows future sessions.
 */
function sampleStudySessions(): StudySession[] {
  const weekStart = startOfWeek(now())
  const today = startOfDay(now())
  const sessions: StudySession[] = []
  const plan: Array<{ dayOffset: number; hour: number; minutes: number; subjectId: string | null; note: string }> = [
    { dayOffset: 0, hour: 8, minutes: 60, subjectId: 'sample-subject-1', note: 'Worked through the security rules examples.' },
    { dayOffset: 0, hour: 19, minutes: 45, subjectId: null, note: 'Read capstone references.' },
    { dayOffset: 1, hour: 16, minutes: 90, subjectId: 'sample-subject-2', note: '' },
    { dayOffset: 2, hour: 9, minutes: 75, subjectId: 'sample-subject-3', note: 'Practice questions.' },
    { dayOffset: 3, hour: 14, minutes: 50, subjectId: 'sample-subject-4', note: '' },
    { dayOffset: 4, hour: 10, minutes: 120, subjectId: 'sample-subject-1', note: 'Built the lab starter.' },
    { dayOffset: 5, hour: 13, minutes: 40, subjectId: null, note: 'Light review.' },
  ]

  let index = 0
  for (const slot of plan) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + slot.dayOffset)
    date.setHours(slot.hour, 0, 0, 0)
    if (date.getTime() > now().getTime() || startOfDay(date).getTime() > today.getTime()) continue
    index += 1
    const durationSeconds = slot.minutes * 60
    sessions.push({
      id: `sample-session-${index}`,
      userId: sampleUser,
      subjectId: slot.subjectId,
      projectId: null,
      startedAt: isoOf(date),
      endedAt: isoOf(new Date(date.getTime() + durationSeconds * 1000)),
      pausedSeconds: 0,
      durationSeconds,
      status: 'completed',
      note: slot.note,
    })
  }

  return sessions
}

const sampleBudget: MonthlyBudget = {
  id: 'sample-budget-1',
  userId: sampleUser,
  month: `${toISODate(addMonths(now(), 0)).slice(0, 7)}-01`,
  amount: 8000,
}

/**
 * Income and expenses for the current month plus the two previous months,
 * so monthly trend views have something to show. In the current month,
 * expenses only appear once their day has actually arrived, so the budget
 * widget never shows money spent in the future.
 */
function sampleTransactions(): Transaction[] {
  const transactions: Transaction[] = []
  let index = 0

  const expensePlan = [
    { offset: 0, amount: 185, category: 'Food', description: 'Lunch at the cafeteria' },
    { offset: 2, amount: 240, category: 'Transport', description: 'Jeepney and bus fare' },
    { offset: 3, amount: 620, category: 'School Supplies', description: 'Printed reports and bond paper' },
    { offset: 5, amount: 320, category: 'Food', description: 'Coffee shop study session' },
    { offset: 7, amount: 1450, category: 'Groceries', description: 'Weekly groceries' },
    { offset: 10, amount: 299, category: 'Internet', description: 'Prepaid internet load' },
    { offset: 13, amount: 750, category: 'Food', description: 'Dinner out with friends' },
    { offset: 17, amount: 150, category: 'Entertainment', description: 'Movie ticket' },
    { offset: 21, amount: 480, category: 'Health', description: 'Pharmacy — vitamins' },
  ]

  const incomePlan = [
    { amount: 5000, category: 'Allowance', description: 'Monthly allowance' },
    { amount: 2500, category: 'Freelance', description: 'Landing page gig' },
  ]

  for (let monthsAgo = 0; monthsAgo <= 2; monthsAgo++) {
    const monthStart = new Date(now().getFullYear(), now().getMonth() - monthsAgo, 1)
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    const maxDay = new Date(nextMonth.getTime() - 86400000).getDate()
    const anchorDay = monthsAgo === 0 ? startOfDay(now()).getDate() : maxDay
    const clampDay = (day: number): number => Math.min(Math.max(day, 1), maxDay)
    /** For the current month, never schedule a date beyond today. */
    const dayFor = (rawDay: number): number =>
      monthsAgo === 0 ? Math.min(clampDay(rawDay), anchorDay) : clampDay(rawDay)
    const monthDate = (day: number): string =>
      toISODate(new Date(monthStart.getFullYear(), monthStart.getMonth(), day))

    incomePlan.forEach((income, incomeIndex) => {
      index += 1
      const variation = 1 - monthsAgo * 0.05
      transactions.push({
        id: `sample-tx-${index}`,
        userId: sampleUser,
        type: 'income',
        amount: Math.round(income.amount * variation),
        category: income.category,
        description: income.description,
        transactionOn: monthDate(dayFor(1 + incomeIndex * 3)),
        createdAt: isoOf(at(-2, 9)),
      })
    })

    for (const expense of expensePlan) {
      // Current month: only once the expense's day has arrived.
      if (monthsAgo === 0 && expense.offset > anchorDay) continue
      index += 1
      const variation = Math.round((expense.amount * (1 - monthsAgo * 0.08)) / 10) * 10
      const rawDay = monthsAgo === 0 ? anchorDay - expense.offset : 3 + (expense.offset % 20)
      transactions.push({
        id: `sample-tx-${index}`,
        userId: sampleUser,
        type: 'expense',
        amount: variation,
        category: expense.category,
        description: expense.description,
        transactionOn: monthDate(dayFor(rawDay)),
        createdAt: isoOf(at(-expense.offset, 12)),
      })
    }
  }

  return transactions
}

function sampleNotes(): Note[] {
  return [
    { id: 'sample-note-1', userId: sampleUser, title: 'Lab 5 ideas — security rules', content: 'Each collection needs its own rule. Test with two accounts before submitting the write-up.', tags: ['school', 'security'], pinned: true, createdAt: isoOf(at(-4, 20)), updatedAt: isoOf(at(0, 7)) },
    { id: 'sample-note-2', userId: sampleUser, title: 'Capstone interview questions', content: 'Ask the barangay secretary how records are currently filed and where errors usually happen.', tags: ['capstone'], pinned: true, createdAt: isoOf(at(-8, 15)), updatedAt: isoOf(at(-1, 21)) },
    { id: 'sample-note-3', userId: sampleUser, title: 'References to read', content: 'Threat modeling — start with STRIDE, then read the OWASP cheat sheets.', tags: ['reading', 'security'], pinned: false, createdAt: isoOf(at(-6, 11)), updatedAt: isoOf(at(-2, 18)) },
    { id: 'sample-note-4', userId: sampleUser, title: 'Budget check-in', content: 'Transport spending crept up this month — batch errands into one trip per week.', tags: ['money'], pinned: false, createdAt: isoOf(at(-12, 20)), updatedAt: isoOf(at(-5, 20)) },
    { id: 'sample-note-5', userId: sampleUser, title: 'Portfolio to-do', content: 'Rewrite the mobile banking case study summary and export fresh screenshots.', tags: ['portfolio'], pinned: false, createdAt: isoOf(at(-15, 19)), updatedAt: isoOf(at(-9, 19)) },
  ]
}

const sampleBookmarks: Bookmark[] = [
  { id: 'sample-bookmark-1', userId: sampleUser, title: 'MDN Web Docs', url: 'https://developer.mozilla.org/', category: 'Reference', description: 'HTML, CSS and JS reference.', createdAt: isoOf(at(-30, 10)) },
  { id: 'sample-bookmark-2', userId: sampleUser, title: 'React documentation', url: 'https://react.dev/', category: 'Reference', description: 'Hooks and component patterns.', createdAt: isoOf(at(-28, 10)) },
  { id: 'sample-bookmark-3', userId: sampleUser, title: 'Firebase docs — Security Rules', url: 'https://firebase.google.com/docs/firestore/security/get-started', category: 'Development', description: 'Rules reference for the final project.', createdAt: isoOf(at(-12, 14)) },
  { id: 'sample-bookmark-4', userId: sampleUser, title: 'Tailwind CSS docs', url: 'https://tailwindcss.com/docs', category: 'Development', description: 'Utility classes and theming.', createdAt: isoOf(at(-20, 16)) },
  { id: 'sample-bookmark-5', userId: sampleUser, title: 'Recharts docs', url: 'https://recharts.org/en-US', category: 'Development', description: 'Chart components used in the dashboard.', createdAt: isoOf(at(-10, 9)) },
  { id: 'sample-bookmark-6', userId: sampleUser, title: 'Figma — community UI kits', url: 'https://www.figma.com/community', category: 'Design', description: 'Wireframe inspiration for the capstone UI.', createdAt: isoOf(at(-7, 21)) },
]
