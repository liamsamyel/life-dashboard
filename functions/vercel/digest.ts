import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'
import { isoDateInTimeZone, renderDigest, selectDeadlines, type DigestSourceItem } from '../lib/digest'

initializeApp()

const TIME_ZONE = 'Asia/Manila'
const DEFAULT_LEAD_DAYS = 3

interface ProfileData {
  displayName?: unknown
  email?: unknown
  notifyEmail?: unknown
  deadlineLeadDays?: unknown
  lastDigestOn?: unknown
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asLeadDays(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(14, Math.max(1, Math.round(value)))
    : DEFAULT_LEAD_DAYS
}

function asItem(data: Record<string, unknown>): DigestSourceItem | null {
  const title = asString(data.title).trim()
  const kind = asString(data.kind)
  if (!title) return null
  if (kind !== 'assignment' && kind !== 'exam' && kind !== 'milestone') return null

  const priority = asString(data.priority)
  const dueDate = asString(data.dueDate)

  return {
    title,
    kind,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
    priority: priority === 'high' || priority === 'low' ? priority : 'medium',
    subjectId: asString(data.subjectId) || null,
  }
}

export const config = {
  runtime: 'nodejs22',
  scheduled: ['0 8 * * *'], // daily at 08:00 Asia/Manila
}

/** Daily deadline digest for Vercel. */
export default async function handler() {
  const todayISO = isoDateInTimeZone(new Date(), TIME_ZONE)

  const [itemsSnapshot, usersSnapshot, subjectsSnapshot] = await Promise.all([
    // Only open items can be due; completed work never triggers a reminder.
    getDb().collection('academicItems').where('status', '!=', 'completed').get(),
    getDb().collection('users').get(),
    getDb().collection('subjects').get(),
  ])

  const subjectNames = new Map<string, string>()
  for (const doc of subjectsSnapshot.docs) {
    subjectNames.set(doc.id, asString(doc.data().name))
  }

  const itemsByUser = new Map<string, DigestSourceItem[]>()
  for (const doc of itemsSnapshot.docs) {
    const data = doc.data() as Record<string, unknown>
    const ownerId = asString(data.userId)
    if (!ownerId) continue
    const parsed = asItem(data)
    if (!parsed) continue
    const list = itemsByUser.get(ownerId) ?? []
    list.push(parsed)
    itemsByUser.set(ownerId, list)
  }

  // SendGrid setup - free tier: 100 emails/day
  // Set SENDGRID_API_KEY in Vercel dashboard environment variables
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  if (!SENDGRID_API_KEY) {
    console.error('Missing SENDGRID_API_KEY environment variable')
    return { error: 'Email service not configured' }
  }

  const transport = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 465,
    secure: true,
    auth: { user: 'apikey', pass: SENDGRID_API_KEY },
  })

  const appUrl = process.env.APP_URL?.trim() || undefined
  let sent = 0
  let skipped = 0

  for (const userDoc of usersSnapshot.docs) {
    const profile = userDoc.data() as ProfileData
    const email = asString(profile.email).trim()

    if (profile.notifyEmail === false || !email) {
      skipped += 1
      continue
    }
    // One digest per user per day, even if the schedule retries.
    if (asString(profile.lastDigestOn) === todayISO) {
      skipped += 1
      continue
    }

    const group = selectDeadlines(
      itemsByUser.get(userDoc.id) ?? [],
      todayISO,
      asLeadDays(profile.deadlineLeadDays),
      subjectNames,
    )
    const message = renderDigest(group, {
      name: asString(profile.displayName).trim().split(' ')[0] || 'there',
      todayISO,
      leadDays: asLeadDays(profile.deadlineLeadDays),
      appUrl,
    })
    if (!message) {
      skipped += 1
      continue
    }

    try {
      await transport.sendMail({
        from: `LifeOS <on behalf of ${SENDGRID_API_KEY}>`,
        to: email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
      await userDoc.ref.set({ lastDigestOn: todayISO }, { merge: true })
      sent += 1
    } catch (error) {
      console.error('Deadline digest: send failed', { userId: userDoc.id, error })
    }
  }

  console.log('Deadline digest complete', { todayISO, sent, skipped })
  return { sent, skipped }
}

/** Helper to get the Firestore database instance. */
function getDb(): import('firebase-admin/firestore').Firestore {
  return getFirestore()
}