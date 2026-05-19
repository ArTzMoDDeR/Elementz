import * as admin from 'firebase-admin'

// Singleton — safe to call multiple times across hot reloads
let app: admin.app.App | undefined

export function getFirebaseAdmin(): admin.app.App {
  if (app) return app

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // Vercel stores multiline secrets with literal \n — convert them back
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    )
  }

  if (admin.apps.length > 0) {
    app = admin.apps[0]!
    return app
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })

  return app
}

export function getMessaging(): admin.messaging.Messaging {
  return getFirebaseAdmin().messaging()
}
