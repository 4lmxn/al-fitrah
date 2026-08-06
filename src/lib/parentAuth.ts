import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthAdmin, getDb } from "@/lib/firebaseAdmin";
import { normalizeIndianPhone } from "@/lib/phone";
import { COLLECTION as STUDENTS } from "@/lib/students";

/**
 * Parent identity.
 *
 * Parents sign in with a phone number and a one-time code. Phone rather than
 * email because it is what the school already holds for every family, what the
 * enquiry form already collects, and what duplicate detection already keys on —
 * adding an email login would mean asking 200 families for a second identifier
 * the school does not have.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: which children a signed-in parent may
 * see is resolved here, server-side, from the verified phone claim in their
 * session. It is never taken from a URL, a form field, or anything else the
 * browser can set. A parent seeing another family's fees or medical notes is
 * the worst failure this system can have, and the only reliable defence is that
 * the client is never asked.
 */

export const PARENT_SESSION_COOKIE = "__parent_session";
export const PARENT_SESSION_MAX_AGE_MS = 60 * 60 * 24 * 14 * 1000; // 14 days

export type ParentSession = {
  /** Normalised digits, matching `students.guardianPhones`. */
  phone: string;
  /** Every student this phone is a guardian of. Possibly several — siblings. */
  studentIds: string[];
};

/**
 * Students a phone number may see.
 *
 * One indexed read. `guardianPhones` is a flat array of normalised numbers kept
 * alongside `guardians[]`, because Firestore cannot match inside an array of
 * objects — without it this would be a full-collection scan on every page a
 * parent opens.
 */
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

/**
 * Exchange a Firebase phone credential for a parent session.
 *
 * Refuses a phone that is not a guardian of any student. That is deliberate:
 * anyone can prove they own a phone number, so ownership alone grants nothing.
 * Authorisation comes from the school's own records.
 */
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

  const phone = normalizeIndianPhone(decoded.phone_number ?? "");
  if (!phone) {
    return { ok: false, status: 400, error: "Please sign in with a phone number." };
  }

  const studentIds = await studentsForPhone(phone);
  if (studentIds.length === 0) {
    // Deliberately does not reveal whether the number is unknown to the school
    // or simply has no child enrolled — both are the same answer to the caller.
    return {
      ok: false,
      status: 403,
      error: "We don't have this number against a student. Please contact the school office.",
    };
  }

  const cookie = await auth.createSessionCookie(idToken, { expiresIn: PARENT_SESSION_MAX_AGE_MS });
  return { ok: true, cookie, phone };
}

/**
 * The current parent, or null.
 *
 * Student ids are re-resolved on every request rather than stored in the
 * cookie. A cookie lives 14 days; a child can be withdrawn, or a guardian
 * removed, in far less. Reading the current truth costs one indexed query and
 * means access ends when the school says it does, not when the cookie expires.
 *
 * Cached per request so a page and its data layer resolve once, not once each.
 */
export const getParentSession = cache(async (): Promise<ParentSession | null> => {
  const store = await cookies();
  const value = store.get(PARENT_SESSION_COOKIE)?.value;
  if (!value) return null;

  let phone: string | null;
  try {
    // checkRevoked: a parent signing out, or the school revoking access, must
    // take effect immediately rather than at cookie expiry.
    const decoded = await getAuthAdmin().verifySessionCookie(value, true);
    phone = normalizeIndianPhone(decoded.phone_number ?? "");
  } catch {
    return null;
  }
  if (!phone) return null;

  const studentIds = await studentsForPhone(phone);
  if (studentIds.length === 0) return null;
  return { phone, studentIds };
});

/** Gate for every parent page. Redirects to the portal sign-in when absent. */
export async function requireParent(): Promise<ParentSession> {
  const session = await getParentSession();
  if (!session) redirect("/portal/sign-in");
  return session;
}

/**
 * Assert that a student id belongs to the signed-in parent.
 *
 * Every parent-facing read of a specific child goes through this. Returning
 * "not found" rather than "not allowed" is intentional: a parent probing ids
 * should not be able to learn which ones exist.
 */
export async function assertOwnStudent(studentId: string): Promise<boolean> {
  const session = await getParentSession();
  return Boolean(session && session.studentIds.includes(studentId));
}
