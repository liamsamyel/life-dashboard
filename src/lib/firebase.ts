import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Firebase connection (stage 6 target).
 *
 * The SDK is only initialized when the config is present, so the app runs
 * (on clearly-labelled sample data) before Firebase is configured. Stage 6
 * replaces the sample-data seam with Firestore queries through this module
 * and wires Firebase Auth. Security comes from `firestore.rules` — every
 * read/write is scoped to `request.auth.uid`, and the config below is
 * public by design.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)

function connect(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  if (!isFirebaseConfigured) return null
  const app = initializeApp(firebaseConfig as Record<string, string>)
  return { app, auth: getAuth(app), db: getFirestore(app) }

}

const connection = connect()

export const app: FirebaseApp | null = connection?.app ?? null
export const auth: Auth | null = connection?.auth ?? null
export const db: Firestore | null = connection?.db ?? null
