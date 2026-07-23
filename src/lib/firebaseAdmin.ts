import { getApps, initializeApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

/**
 * Server-only Firebase Admin init.
 * Credentials resolution order:
 *  1. FIREBASE_SERVICE_ACCOUNT_KEY  — full service-account JSON (string), for local dev.
 *  2. Application Default Credentials — used automatically on Firebase App Hosting.
 * Never import this from a Client Component.
 */
let app: App | undefined;

export function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let credential;
  if (raw) {
    try {
      credential = cert(JSON.parse(raw));
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is set but is not valid JSON — check the env value.",
      );
    }
  } else {
    credential = applicationDefault();
  }
  app = initializeApp({ credential, projectId });
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAuthAdmin(): Auth {
  return getAuth(getAdminApp());
}

export function getBucket() {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return getStorage(getAdminApp()).bucket(name);
}
