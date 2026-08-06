"use client";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

function clientApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export async function signInWithGoogle(): Promise<string> {
  const auth = getAuth(clientApp());
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

/**
 * Phone sign-in for parents.
 *
 * Firebase requires a reCAPTCHA verifier before it will send a code — it is the
 * only thing standing between a public form and an unbounded SMS bill. The
 * invisible variant keeps it out of the parent's way while still gating sends.
 */
export async function sendParentOtp(phoneE164: string, containerId: string) {
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  const auth = getAuth(clientApp());
  // Indian numbers; the school's families are local and the input collects ten
  // digits, so the country code is added rather than asked for.
  const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return signInWithPhoneNumber(auth, phoneE164, verifier);
}
