import type { Firestore } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'
import { isoDateInTimeZone, renderDigest, selectBills, selectDeadlines, type BillSourceItem, type DigestSourceItem } from './digest'

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
  if (!title || (kind !== 'assignment' && kind !== 'exam' && kind !== 'milestone')) return null
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

function asBill(data: Record<string, unknown>): BillSourceItem | null {
  const title = asString(data.title).trim()
  const dueDate = asString(data.dueDate)
  const amount = data.amount
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || typeof amount !== 'number') return null
  return { title, amount, dueDate, paid: data.paid === true }
}

export async function sendDailyDigest(
  db: Firestore,
  options: { gmailUser: string; gmailAppPassword: string; appUrl?: string; now?: Date },
): Promise<void> {
  const todayISO = isoDateInTimeZone(options.now ?? new Date(), 'Asia/Manila')

  const [itemsSnapshot, usersSnapshot, subjectsSnapshot, billsSnapshot] = await Promise.all([
    db.collection('academicItems').where('status', '!=', 'completed').get(),
    db.collection('users').get(),
    db.collection('subjects').get(),
    db.collection('bills').get(),
  ])

  const subjectNames = new Map<string, string>()
  for (const doc of subjectsSnapshot.docs) subjectNames.set(doc.id, asString(doc.data().name))

  const itemsByUser = new Map<string, DigestSourceItem[]>()
  for (const doc of itemsSnapshot.docs) {
    const ownerId = asString(doc.data().userId)
    const parsed = asItem(doc.data() as Record<string, unknown>)
    if (!ownerId || !parsed) continue
    itemsByUser.set(ownerId, [...(itemsByUser.get(ownerId) ?? []), parsed])
  }

  const billsByUser = new Map<string, BillSourceItem[]>()
  for (const doc of billsSnapshot.docs) {
    const ownerId = asString(doc.data().userId)
    const parsed = asBill(doc.data() as Record<string, unknown>)
    if (!ownerId || !parsed) continue
    billsByUser.set(ownerId, [...(billsByUser.get(ownerId) ?? []), parsed])
  }

  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: options.gmailUser, pass: options.gmailAppPassword },
  })

  let sent = 0
  let skipped = 0
  let failed = 0
  let remindersOff = 0
  let missingEmail = 0
  let alreadySent = 0
  let noMatchingItems = 0
  let matchingDeadlines = 0
  let matchingBills = 0
  for (const userDoc of usersSnapshot.docs) {
    const profile = userDoc.data() as ProfileData
    const email = asString(profile.email).trim()
    if (profile.notifyEmail === false) {
      remindersOff += 1
      skipped += 1
      continue
    }
    if (!email) {
      missingEmail += 1
      skipped += 1
      continue
    }
    if (asString(profile.lastDigestOn) === todayISO) {
      alreadySent += 1
      skipped += 1
      continue
    }

    const leadDays = asLeadDays(profile.deadlineLeadDays)
    const deadlines = selectDeadlines(itemsByUser.get(userDoc.id) ?? [], todayISO, leadDays, subjectNames)
    const bills = selectBills(billsByUser.get(userDoc.id) ?? [], todayISO, leadDays)
    matchingDeadlines += deadlines.dueSoon.length + deadlines.overdue.length
    matchingBills += bills.billsDueSoon.length + bills.billsOverdue.length
    const message = renderDigest({ ...deadlines, ...bills }, {
      name: asString(profile.displayName).trim().split(' ')[0] || 'there',
      todayISO,
      leadDays,
      appUrl: options.appUrl,
    })
    if (!message) {
      noMatchingItems += 1
      skipped += 1
      continue
    }

    try {
      await transport.sendMail({
        from: `LifeOS <${options.gmailUser}>`, to: email,
        subject: message.subject, text: message.text, html: message.html,
      })
      await userDoc.ref.set({ lastDigestOn: todayISO }, { merge: true })
      sent += 1
    } catch (error) {
      console.error('Deadline digest: send failed', { userId: userDoc.id, error })
      failed += 1
    }
  }

  transport.close()
  console.info('Deadline digest complete', {
    todayISO,
    sent,
    skipped,
    recordsRead: { profiles: usersSnapshot.size, openPlannerItems: itemsSnapshot.size, bills: billsSnapshot.size },
    matchingItems: { deadlines: matchingDeadlines, bills: matchingBills },
    skippedReasons: { remindersOff, missingEmail, alreadySent, noMatchingItems },
  })
  if (failed > 0) throw new Error(`Deadline digest could not be sent to ${failed} user(s). See the preceding error details.`)
}
