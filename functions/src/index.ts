import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { sendDailyDigest } from './sendDigest'

async function main(): Promise<void> {
  const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
  if (!serviceAccountJSON || !gmailUser || !gmailAppPassword) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON, GMAIL_USER, and GMAIL_APP_PASSWORD.')
  }

  const serviceAccount = JSON.parse(serviceAccountJSON) as Parameters<typeof cert>[0]
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()
  try {
    await sendDailyDigest(db, {
      gmailUser,
      gmailAppPassword,
      appUrl: process.env.APP_URL?.trim() || undefined,
    })
  } finally {
    await db.terminate()
  }
}

main().catch((error: unknown) => {
  console.error('Deadline digest failed.', error)
  process.exitCode = 1
})
