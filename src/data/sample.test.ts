import { describe, expect, it } from 'vitest'
import { buildSampleData, sampleUser } from './sample'
import { parseISODate, startOfDay, startOfWeek, toISODate } from '../lib/dates'

/**
 * Invariants that keep development sample data honest: clearly-labelled ids,
 * no future-dated money in the current month, and no study sessions in the
 * future or outside the current week.
 */
describe('sample data', () => {
  const data = buildSampleData()
  const builtAt = new Date()
  const now = startOfDay(builtAt)

  it('labels every record and belongs to the sample user', () => {
    const collections = [
      data.tasks,
      data.subjects,
      data.projects,
      data.academicItems,
      data.habits,
      data.habitCompletions,
      data.studySessions,
      data.transactions,
      data.notes,
      data.bookmarks,
    ]

    for (const collection of collections) {
      expect(collection.length).toBeGreaterThan(0)
      for (const record of collection) {
        expect(record.id.startsWith('sample-')).toBe(true)
        expect(record.userId).toBe(sampleUser)
      }
    }
    expect(data.profile.id).toBe(sampleUser)
  })

  it('never schedules money in the future within the current month', () => {
    const currentMonth = `${toISODate(now).slice(0, 7)}-`
    for (const tx of data.transactions) {
      if (!tx.transactionOn.startsWith(currentMonth)) continue
      expect(parseISODate(tx.transactionOn).getTime()).toBeLessThanOrEqual(now.getTime())
      expect(tx.amount).toBeGreaterThan(0)
    }
  })

  it('keeps study sessions inside the current week and in the past', () => {
    const weekStart = startOfWeek(now).getTime()
    expect(data.studySessions.length).toBeGreaterThan(0)
    for (const session of data.studySessions) {
      expect(new Date(session.startedAt).getTime()).toBeGreaterThanOrEqual(weekStart)
      expect(new Date(session.startedAt).getTime()).toBeLessThanOrEqual(builtAt.getTime())
      expect(session.durationSeconds).toBeGreaterThan(0)
    }
  })

  it('sets a budget for the current month', () => {
    expect(data.budget.month).toBe(`${toISODate(now).slice(0, 7)}-01`)
    expect(data.budget.amount).toBeGreaterThan(0)
  })
})
