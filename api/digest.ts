/**
 * Vercel serverless function: daily deadline digest email.
 * 
 * Runs via Vercel cron: `0 8 * * *` (daily at 08:00 Asia/Manila)
 * 
 * Requires environment variables in Vercel dashboard:
 *   SENDGRID_API_KEY - your SendGrid API key (free tier: 100 emails/day)
 *   (Firestore access uses the project's default credentials)
 * 
 * The function reads academic items from Firestore, groups by user,
 * and sends Gmail-style digests via SendGrid SMTP.
 */

import { getFirestore } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'
import { isoDateInTimeZone, renderDigest, selectDeadlines, type DigestSourceItem } from './src/lib/digest'

// Firestore database instance
let db: ReturnType<typeof getFirestore> | null = null

function getDb(): ReturnType<typeof getFirestore> {
  if (!db) {
    // Initialize Firebase Admin - uses default credentials in production
    // In development, ensure GOOGLE_APPLICATION_CREDENTIALS or project config is set
    const admin = require('firebase-admin')
    if (!admin.apps.length) {
      admin.initializeApp()
    }
    db = admin.firestore()
  }
  return db
}

// Type definitions mirrored from the original function
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
    : 3
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

/**
 * Vercel cron entry point.
 * Scheduled: `0 8 * * *` daily at 08:00 Asia/Manila.
 */
export const config = {
  runtime: 'nodejs22',
  // Vercel cron schedule — runs at 8AM Asia/Manila every day
  // The `scheduled` field in vercel.json or dashboard sets this.
  scheduled: ['0 8 * * *'],
}

export default async function handler() {
  const TIME_ZONE = 'Asia/Manila'
  const todayISO = isoDateInTimeZone(new Date(), TIME_ZONE)

  // 1. Fetch all open academic items from Firestore
  const itemsSnapshot = await getDb()
    .collection('academicItems')
    .where('status', '!=', 'completed')
    .get()

  // 2. Fetch all users
  const usersSnapshot = await getDb().collection('users').get()

  // 3. Build subject name map
  const subjectNames = new Map<string, string>()
  // Also fetch subjects if needed - they should already be in the system
  // For now, we'll try to read subject names from the document data

  // 4. Group items by user
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

  // 5. Set up SendGrid transporter
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  if (!SENDGRID_API_KEY) {
    console.error('Missing SENDGRID_API_KEY environment variable')
    return { error: 'Email service not configured — add SENDGRID_API_KEY to Vercel env' }
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

  // 6. Send digest to each user
  for (const userDoc of usersSnapshot.docs) {
    const profile = userDoc.data() as ProfileData
    const email = asString(profile.email).trim()

    if (profile.notifyEmail === false || !email) {
      skipped += 1
      continue
    }
    // Throttle: one digest per user per day
    if (asString(profile.lastDigestOn) === todayISO) {
      skipped += 1
      continue
    }

    // Select deadlines within the lead window + overdue
    const group = selectDeadlines(
      itemsByUser.get(userDoc.id) ?? [],
      todayISO,
      asLeadDays(profile.deadlineLeadDays),
      // We'll pass an empty map; subjects can be looked up if needed
      new Map(),
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
      // Mark digest as sent for this user
      await userDoc.ref.set({ lastDigestOn: todayISO }, { merge: true })
      sent += 1
    } catch (error) {
      console.error('Deadline digest: send failed', { userId: userDoc.id, error })
      // Don't crash; continue with other users
    }
  }

  console.log('Deadline digest complete', { todayISO, sent, skipped })
  return { sent, skipped }
}