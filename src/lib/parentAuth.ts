import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthAdmin, getDb } from "@/lib/firebaseAdmin";
import { normalizeIndianPhone } from "@/lib/phone";
import { COLLECTION as STUDENTS } from "@/lib/students";

export const PARENT_SESSION_COOKIE = "__parent_session";
export const PARENT_SESSION_MAX_AGE_MS = 60 * 60 * 24 * 14 * 1000;

export type ParentSession = {
  phone: string;
  studentIds: string[];
};

export async function studentsForEmail(email: string): Promise<string[]> {
  const key = email.trim().toLowerCase();
  if (!key) return [];
  const snap = await getDb()
    .collection(STUDENTS)
    .where("guardianEmails", "array-contains", key)
    .limit(20)
    .get();
  return snap.docs.map((d) => d.id);
}

export async function studentsForPhone(phone: string): Promise<string[]> {
  const key = normalizeIndianPhone(phone);
  if (!key) return [];
  const snap = await getDb()
    .collection(STUDENTS)
    .where("guardianPhones", "array-contains", key)
    // A family with more than this many children at one preschool is not a
    // case worth an unbounded read.
    .limit(20)
    .get();
  return snap.docs.map((d) => d.id);
}

export async function createParentSession(
  idToken: string,
): Promise<{ ok: true; cookie: string; phone: string } | { ok: false; status: number; error: string }> {
  const auth = getAuthAdmin();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    return { ok: false, status: 401, error: "That sign-in didn't work. Please request a new code." };
  }

  const identity = await resolveIdentity(decoded);
  if (!identity) {
    return { ok: false, status: 400, error: "That sign-in didn't carry an email or a phone number." };
  }

  const studentIds = identity.studentIds;
  if (studentIds.length === 0) {
    return {
      ok: false,
      status: 403,
      error: "We don't have this number against a student. Please contact the school office.",
    };
  }

  const cookie = await auth.createSessionCookie(idToken, { expiresIn: PARENT_SESSION_MAX_AGE_MS });
  return { ok: true, cookie, phone: identity.key };
}

async function resolveIdentity(
  decoded: { email?: string; phone_number?: string },
): Promise<{ key: string; studentIds: string[] } | null> {
  const email = (decoded.email ?? "").trim().toLowerCase();
  if (email) return { key: email, studentIds: await studentsForEmail(email) };

  const phone = normalizeIndianPhone(decoded.phone_number ?? "");
  if (phone) return { key: phone, studentIds: await studentsForPhone(phone) };

  return null;
}

export const getParentSession = cache(async (): Promise<ParentSession | null> => {
  const store = await cookies();
  const value = store.get(PARENT_SESSION_COOKIE)?.value;
  if (!value) return null;

  try {
    const decoded = await getAuthAdmin().verifySessionCookie(value, true);
    const identity = await resolveIdentity(decoded);
    if (!identity || identity.studentIds.length === 0) return null;
    return { phone: identity.key, studentIds: identity.studentIds };
  } catch {
    return null;
  }
});

export async function requireParent(): Promise<ParentSession> {
  const session = await getParentSession();
  if (!session) redirect("/portal/sign-in");
  return session;
}

export async function assertOwnStudent(studentId: string): Promise<boolean> {
  const session = await getParentSession();
  return Boolean(session && session.studentIds.includes(studentId));
}
