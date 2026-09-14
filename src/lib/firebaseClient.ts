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

export async function sendParentOtp(phoneE164: string, containerId: string) {
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  const auth = getAuth(clientApp());
  const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return signInWithPhoneNumber(auth, phoneE164, verifier);
}

export async function sendParentEmailLink(email: string): Promise<void> {
  const { getAuth, sendSignInLinkToEmail } = await import("firebase/auth");
  const auth = getAuth(clientApp());
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/portal/sign-in`,
    handleCodeInApp: true,
  });
  try {
    window.localStorage.setItem("alfitrah.parent-email", email);
  } catch {
    // Private browsing; the parent will be asked to confirm the address.
  }
}

export async function completeParentEmailLink(fallbackEmail?: string): Promise<string | null> {
  const { getAuth, isSignInWithEmailLink, signInWithEmailLink } = await import("firebase/auth");
  const auth = getAuth(clientApp());
  if (!isSignInWithEmailLink(auth, window.location.href)) return null;

  let email = fallbackEmail ?? "";
  try {
    email = email || window.localStorage.getItem("alfitrah.parent-email") || "";
  } catch {
    // ignore
  }
  if (!email) return null;

  const credential = await signInWithEmailLink(auth, email, window.location.href);
  try {
    window.localStorage.removeItem("alfitrah.parent-email");
  } catch {
    // ignore
  }
  return credential.user.getIdToken();
}
