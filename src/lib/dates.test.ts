import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  isSameDay,
  parseISODate,
  startOfWeek,
  toISODate,
} from './dates'

describe('dates', () => {
  it('starts the week on Monday', () => {
    // 21 October 2026 is a Wednesday; its week starts Monday 19 October.
    expect(toISODate(startOfWeek(new Date(2026, 9, 21, 15, 30)))).toBe('2026-10-19')
    // A Monday maps to itself.
    expect(toISODate(startOfWeek(new Date(2026, 9, 19, 0, 0)))).toBe('2026-10-19')
    // A Sunday belongs to the week that started the previous Monday.
    expect(toISODate(startOfWeek(new Date(2026, 9, 25, 23, 59)))).toBe('2026-10-19')
  })

  it('formats local calendar dates with zero padding', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('parses YYYY-MM-DD as a local date (no UTC shift)', () => {
    expect(parseISODate('2026-03-01').getTime()).toBe(new Date(2026, 2, 1).getTime())
    expect(parseISODate('2026-03-01').getMonth()).toBe(2)
  })

  it('adds days across month boundaries', () => {
    expect(toISODate(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01')
    expect(toISODate(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01')
    expect(toISODate(addDays(new Date(2026, 9, 24), -24))).toBe('2026-09-30')
  })

  it('computes whole calendar days between dates', () => {
    expect(daysBetween(parseISODate('2026-10-19'), parseISODate('2026-10-21'))).toBe(2)
    expect(daysBetween(parseISODate('2026-10-21'), parseISODate('2026-10-19'))).toBe(-2)
    expect(daysBetween(parseISODate('2026-10-19'), parseISODate('2026-10-19'))).toBe(0)
  })

  it('compares days ignoring time of day', () => {
    expect(isSameDay(new Date(2026, 9, 24, 0, 1), new Date(2026, 9, 24, 23, 59))).toBe(true)
    expect(isSameDay(new Date(2026, 9, 24, 23, 59), new Date(2026, 9, 25, 0, 0))).toBe(false)
  })
})
