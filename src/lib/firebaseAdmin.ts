import { getApps, initializeApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin init.
 * Credentials resolution order:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY  — full service-account JSON (string), for local dev.
 *  2. Application Default Credentials — used automatically on Firebase App Hosting.
 * Never import this from a Client Component.
 */
let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  app = initializeApp({
    credential: raw ? cert(JSON.parse(raw)) : applicationDefault(),
    projectId,
  });
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getAdminApp());
}
