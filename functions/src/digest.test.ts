import { describe, expect, it } from 'vitest'
import {
  daysBetweenISO,
  formatDisplayDate,
  isoDateInTimeZone,
  relativeLabel,
  renderDigest,
  selectDeadlines,
  type DigestSourceItem,
} from './digest'

const TODAY = '2026-10-25'

function item(overrides: Partial<DigestSourceItem> & Pick<DigestSourceItem, 'title'>): DigestSourceItem {
  return {
    kind: 'assignment',
    dueDate: null,
    priority: 'medium',
    subjectId: null,
    ...overrides,
  }
}

const subjects = new Map([
  ['sub-1', 'IT 214 — Web Systems'],
  ['sub-2', 'IT 220 — Information Assurance'],
])

describe('isoDateInTimeZone', () => {
  it('formats the calendar day in the requested zone', () => {
    // 2026-10-25T20:30Z is already 26 October in Manila (UTC+8).
    expect(isoDateInTimeZone(new Date('2026-10-25T20:30:00Z'), 'Asia/Manila')).toBe('2026-10-26')
    expect(isoDateInTimeZone(new Date('2026-10-25T20:30:00Z'), 'UTC')).toBe('2026-10-25')
    expect(isoDateInTimeZone(new Date('2026-10-25T02:00:00Z'), 'Asia/Manila')).toBe('2026-10-25')
  })
})

describe('daysBetweenISO', () => {
  it('counts calendar days, including across month and year ends', () => {
    expect(daysBetweenISO('2026-10-25', '2026-10-25')).toBe(0)
    expect(daysBetweenISO('2026-10-25', '2026-10-28')).toBe(3)
    expect(daysBetweenISO('2026-10-25', '2026-10-24')).toBe(-1)
    expect(daysBetweenISO('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('relativeLabel', () => {
  it('describes both directions', () => {
    expect(relativeLabel(0)).toBe('today')
    expect(relativeLabel(1)).toBe('tomorrow')
    expect(relativeLabel(4)).toBe('in 4 days')
    expect(relativeLabel(-1)).toBe('1 day overdue')
    expect(relativeLabel(-3)).toBe('3 days overdue')
  })
})

describe('formatDisplayDate', () => {
  it('renders a human date without shifting the day', () => {
    // Formatted in UTC on purpose: no time zone can push the day backwards.
    expect(formatDisplayDate('2026-10-25')).toBe('Sun, Oct 25, 2026')
    expect(formatDisplayDate('2026-01-01')).toBe('Thu, Jan 1, 2026')
  })
})

describe('selectDeadlines', () => {
  it('includes only open items inside the lead window plus overdue ones', () => {
    const items: DigestSourceItem[] = [
      item({ title: 'Lab 5 — auth rules', dueDate: '2026-10-27', subjectId: 'sub-1' }),
      item({ title: 'IAS unit exam', kind: 'exam', dueDate: '2026-10-25', subjectId: 'sub-2', priority: 'high' }),
      item({ title: 'Capstone outline', kind: 'milestone', dueDate: '2026-10-26' }),
      item({ title: 'Too far away', dueDate: '2026-11-10' }),
      item({ title: 'No due date' }),
      item({ title: 'Old paper', dueDate: '2026-10-20', subjectId: 'sub-1' }),
    ]

    const group = selectDeadlines(items, TODAY, 3, subjects)

    expect(group.dueSoon.map((entry) => entry.title)).toEqual([
      'IAS unit exam',
      'Capstone outline',
      'Lab 5 — auth rules',
    ])
    expect(group.overdue.map((entry) => entry.title)).toEqual(['Old paper'])
    expect(group.dueSoon[0]).toMatchObject({
      kind: 'exam',
      daysUntil: 0,
      subject: 'IT 220 — Information Assurance',
    })
    expect(group.overdue[0].daysUntil).toBe(-5)
    expect(group.overdue[0].subject).toBe('IT 214 — Web Systems')
  })

  it('respects the lead window boundary', () => {
    const items = [item({ title: 'Exactly at the edge', dueDate: '2026-10-28' })]
    expect(selectDeadlines(items, TODAY, 3).dueSoon).toHaveLength(1)
    expect(selectDeadlines(items, TODAY, 2).dueSoon).toHaveLength(0)
  })

  it('accepts a plain object of subject names too', () => {
    const group = selectDeadlines(
      [item({ title: 'With subject', dueDate: '2026-10-26', subjectId: 'sub-1' })],
      TODAY,
      3,
      { 'sub-1': 'Web Systems' },
    )
    expect(group.dueSoon[0].subject).toBe('Web Systems')
  })
})

describe('renderDigest', () => {
  const group = selectDeadlines(
    [
      item({ title: 'Lab 5 — auth rules', dueDate: '2026-10-27', subjectId: 'sub-1' }),
      item({ title: 'Old paper', dueDate: '2026-10-20' }),
    ],
    TODAY,
    3,
    subjects,
  )

  it('renders subject, text, and html with both sections', () => {
    const message = renderDigest(group, { name: 'Miguel', todayISO: TODAY, leadDays: 3 })
    expect(message).not.toBeNull()
    expect(message?.subject).toBe('LifeOS — 1 due soon · 1 overdue')
    expect(message?.text).toContain('Hi Miguel,')
    expect(message?.text).toContain('Due in the next 3 days:')
    expect(message?.text).toContain('Lab 5 — auth rules (IT 214 — Web Systems) — Assignment')
    expect(message?.text).toContain('Overdue and still open:')
    expect(message?.text).toContain('5 days overdue')
    expect(message?.html).toContain('Lab 5 — auth rules')
    expect(message?.html).not.toContain('<script')
  })

  it('returns null when nothing is due, so no empty email is sent', () => {
    expect(renderDigest({ dueSoon: [], overdue: [] }, { name: 'Miguel', todayISO: TODAY, leadDays: 3 })).toBeNull()
  })

  it('escapes user content in the html body', () => {
    const message = renderDigest(
      {
        dueSoon: [
          {
            title: '<img src=x onerror=alert(1)>',
            kind: 'exam',
            priority: 'high',
            dueDate: '2026-10-26',
            subject: '',
            daysUntil: 1,
          },
        ],
        overdue: [],
      },
      { name: 'Miguel <script>', todayISO: TODAY, leadDays: 3 },
    )
    expect(message?.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(message?.html).toContain('Miguel &lt;script&gt;')
  })

  it('adds the planner link only when an app URL is configured', () => {
    const withoutUrl = renderDigest(group, { name: 'M', todayISO: TODAY, leadDays: 3 })
    expect(withoutUrl?.text).not.toContain('Open your planner')

    const withUrl = renderDigest(group, {
      name: 'M',
      todayISO: TODAY,
      leadDays: 3,
      appUrl: 'https://lifeos.example.com/planner',
    })
    expect(withUrl?.text).toContain('https://lifeos.example.com/planner')
    expect(withUrl?.html).toContain('href="https://lifeos.example.com/planner"')
  })
})
