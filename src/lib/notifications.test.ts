import { describe, expect, it } from 'vitest'
import { DEFAULT_LEAD_DAYS, LEAD_DAY_OPTIONS, isValidEmail, normalizeLeadDays } from './notifications'

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('miguel@gmail.com')).toBe(true)
    expect(isValidEmail('  miguel.santos+lifeos@gmail.com  ')).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
  })

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('miguel')).toBe(false)
    expect(isValidEmail('miguel@')).toBe(false)
    expect(isValidEmail('@gmail.com')).toBe(false)
    expect(isValidEmail('miguel@gmail')).toBe(false)
    expect(isValidEmail('miguel santos@gmail.com')).toBe(false)
    expect(isValidEmail(`${'a'.repeat(250)}@gmail.com`)).toBe(false)
  })
})

describe('normalizeLeadDays', () => {
  it('keeps values inside 1–14 days', () => {
    expect(normalizeLeadDays(3)).toBe(3)
    expect(normalizeLeadDays(0)).toBe(1)
    expect(normalizeLeadDays(-5)).toBe(1)
    expect(normalizeLeadDays(30)).toBe(14)
    expect(normalizeLeadDays(2.6)).toBe(3)
  })

  it('falls back to the default for non-finite numbers', () => {
    expect(normalizeLeadDays(Number.NaN)).toBe(DEFAULT_LEAD_DAYS)
    expect(normalizeLeadDays(Number.POSITIVE_INFINITY)).toBe(DEFAULT_LEAD_DAYS)
  })

  it('offers only valid options', () => {
    for (const option of LEAD_DAY_OPTIONS) {
      expect(normalizeLeadDays(option)).toBe(option)
    }
  })
})
