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
 * Parents sign in by EMAIL LINK where the school has an email for them, and by
 * phone code where it does not.
 *
 * Email is the default because it is free: Firebase bills every verification
 * SMS, with no free allowance, and India sits in one of the more expensive
 * bands. Email sign-in falls under the 50,000 monthly-active-user tier that
 * costs nothing.
 *
 * Phone is kept as the fallback because the school's own data requires it. A
 * phone number is mandatory on the enquiry form, the CSV import and every
 * guardian record; an email is optional in all three. Email-only sign-in would
 * lock out every family that never gave one — which, in the records as they
 * stand, is most of them.
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
  /** The credential this parent signed in with — an email, or normalised digits. */
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

  const identity = await resolveIdentity(decoded);
  if (!identity) {
    return { ok: false, status: 400, error: "That sign-in didn't carry an email or a phone number." };
  }

  const studentIds = identity.studentIds;
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
  return { ok: true, cookie, phone: identity.key };
}

/**
 * Map a verified token to the students it may see.
 *
 * Email is checked first because it is the no-cost path and the one most
 * families will use; phone is the fallback for families with no email on
 * record. Either way the answer comes from the school's records, not from the
 * fact that someone controls an inbox or a handset.
 */
async function resolveIdentity(
  decoded: { email?: string; phone_number?: string },
): Promise<{ key: string; studentIds: string[] } | null> {
  const email = (decoded.email ?? "").trim().toLowerCase();
  if (email) return { key: email, studentIds: await studentsForEmail(email) };

  const phone = normalizeIndianPhone(decoded.phone_number ?? "");
  if (phone) return { key: phone, studentIds: await studentsForPhone(phone) };

  return null;
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

  try {
    // checkRevoked: a parent signing out, or the school revoking access, must
    // take effect immediately rather than at cookie expiry.
    const decoded = await getAuthAdmin().verifySessionCookie(value, true);
    const identity = await resolveIdentity(decoded);
    if (!identity || identity.studentIds.length === 0) return null;
    return { phone: identity.key, studentIds: identity.studentIds };
  } catch {
    return null;
  }
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
