import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import nodemailer from 'nodemailer'
import { isoDateInTimeZone, renderDigest, selectDeadlines, type DigestSourceItem } from './digest'

/**
 * Daily deadline digest.
 *
 * Runs once a day at 08:00 Asia/Manila, reads every open academic item
 * (`academicItems`), groups it by owner, and emails each user whose profile
 * has `notifyEmail` enabled a summary of deadlines inside their
 * `deadlineLeadDays` window plus anything already overdue.
 *
 * Delivery uses Gmail SMTP with an app password, so the mail comes from the
 * owner's own Gmail address. Both secrets are stored with
 * `firebase functions:secrets:set` and never live in the repository:
 *   GMAIL_USER           — the Gmail address that sends (e.g. you@gmail.com)
 *   GMAIL_APP_PASSWORD   — a 16-character Google app password
 *
 * The Admin SDK bypasses Firestore security rules, which is why this runs as
 * a trusted server job rather than in the browser. It never exposes data in
 * one user's email that belongs to another user: items are grouped by their
 * own `userId` and each email only contains that user's items.
 */

initializeApp()
const db = getFirestore()

const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

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

export const sendDeadlineDigest = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: TIME_ZONE,
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
    retryCount: 1,
    timeoutSeconds: 540,
    memory: '256MiB',
    labels: { feature: 'deadline-digest' },
  },
  async () => {
    const todayISO = isoDateInTimeZone(new Date(), TIME_ZONE)

    const [itemsSnapshot, usersSnapshot, subjectsSnapshot] = await Promise.all([
      // Only open items can be due; completed work never triggers a reminder.
      db.collection('academicItems').where('status', '!=', 'completed').get(),
      db.collection('users').get(),
      db.collection('subjects').get(),
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

    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() },
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
          from: `LifeOS <${GMAIL_USER.value()}>`,
          to: email,
          subject: message.subject,
          text: message.text,
          html: message.html,
        })
        await userDoc.ref.set({ lastDigestOn: todayISO }, { merge: true })
        sent += 1
      } catch (error) {
        // One bad address must not stop the rest of the digest run.
        logger.error('Deadline digest: send failed', { userId: userDoc.id, error })
      }
    }

    logger.info('Deadline digest complete', { todayISO, sent, skipped })
  },
)
