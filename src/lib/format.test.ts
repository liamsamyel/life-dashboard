import { describe, expect, it } from 'vitest'
import {
  formatDueDate,
  formatDuration,
  formatLongDate,
  formatPHP,
  formatDate,
  formatRelativeTimestamp,
  greetingFor,
} from './format'

describe('formatPHP', () => {
  it('formats Philippine pesos with symbol, grouping, and two decimals', () => {
    expect(formatPHP(1234.5)).toBe('₱1,234.50')
    expect(formatPHP(0)).toBe('₱0.00')
    expect(formatPHP(1000000)).toBe('₱1,000,000.00')
    expect(formatPHP(250)).toBe('₱250.00')
  })

  it('keeps the sign in front of the currency symbol', () => {
    expect(formatPHP(-250)).toBe('-₱250.00')
    expect(formatPHP(-1234.5)).toBe('-₱1,234.50')
  })
})

describe('formatDuration', () => {
  it('renders compact hour/minute durations', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(3725)).toBe('1h 2m')
    expect(formatDuration(5400)).toBe('1h 30m')
    expect(formatDuration(7200)).toBe('2h')
  })
})

describe('formatDueDate', () => {
  const now = new Date(2026, 9, 24, 12) // Saturday, 24 October 2026

  it('describes relative due dates in words', () => {
    expect(formatDueDate('2026-10-24', now)).toBe('Today')
    expect(formatDueDate('2026-10-25', now)).toBe('Tomorrow')
    expect(formatDueDate('2026-10-27', now)).toBe('in 3 days')
    expect(formatDueDate('2026-10-23', now)).toBe('1 day overdue')
    expect(formatDueDate('2026-10-21', now)).toBe('3 days overdue')
  })

  it('renders far dates in the chosen display format', () => {
    expect(formatDueDate('2026-11-15', now)).toBe('2026-11-15')
    expect(formatDueDate('2026-11-15', now, 'MM/DD/YYYY')).toBe('11/15/2026')
    expect(formatDueDate('2026-11-15', now, 'DD/MM/YYYY')).toBe('15/11/2026')
  })
})

describe('formatDate', () => {
  const date = new Date(2026, 0, 5) // 5 January 2026

  it('honors each supported display format', () => {
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2026-01-05')
    expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/05/2026')
    expect(formatDate(date, 'DD/MM/YYYY')).toBe('05/01/2026')
  })
})

describe('greetingFor', () => {
  it('greets by time of day', () => {
    expect(greetingFor(new Date(2026, 9, 24, 7))).toBe('Good morning')
    expect(greetingFor(new Date(2026, 9, 24, 13))).toBe('Good afternoon')
    expect(greetingFor(new Date(2026, 9, 24, 20))).toBe('Good evening')
    expect(greetingFor(new Date(2026, 9, 24, 3))).toBe('Good evening')
  })

  it('evaluates the hour in the profile time zone when given', () => {
    const instant = new Date('2026-10-24T22:00:00Z')
    expect(greetingFor(instant, 'Asia/Manila')).toBe('Good morning') // 06:00 next day
    expect(greetingFor(instant, 'UTC')).toBe('Good evening') // 22:00
  })
})

describe('formatRelativeTimestamp', () => {
  const now = new Date(2026, 9, 24, 12)

  it('labels recent timestamps relative to today', () => {
    expect(formatRelativeTimestamp(new Date(2026, 9, 24, 7).toISOString(), now)).toBe('Today')
    expect(formatRelativeTimestamp(new Date(2026, 9, 23, 7).toISOString(), now)).toBe('Yesterday')
    expect(formatRelativeTimestamp(new Date(2026, 9, 21, 7).toISOString(), now)).toBe(
      '3 days ago',
    )
    expect(formatRelativeTimestamp(new Date(2026, 9, 4, 7).toISOString(), now)).toBe('4 Oct')
  })
})

describe('formatLongDate', () => {
  it('renders the dashboard date in the chosen format (ISO by default)', () => {
    expect(formatLongDate(new Date(2026, 9, 24))).toBe('Saturday, 2026-10-24')
    expect(formatLongDate(new Date(2026, 9, 24), 'MM/DD/YYYY')).toBe('Saturday, 10/24/2026')
    expect(formatLongDate(new Date(2026, 9, 24), 'DD/MM/YYYY')).toBe('Saturday, 24/10/2026')
  })

  it('uses the calendar day of the given time zone', () => {
    // 20:00 UTC on Saturday is already Sunday morning in Manila (UTC+8).
    expect(formatLongDate(new Date('2026-10-24T20:00:00Z'), 'YYYY-MM-DD', 'Asia/Manila')).toBe(
      'Sunday, 2026-10-25',
    )
    expect(formatLongDate(new Date('2026-10-24T20:00:00Z'), 'YYYY-MM-DD', 'UTC')).toBe(
      'Saturday, 2026-10-24',
    )
  })
})
