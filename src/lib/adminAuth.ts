import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthAdmin } from "@/lib/firebaseAdmin";

export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export function getAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().includes(email.toLowerCase());
}

export async function createSession(
  idToken: string,
): Promise<{ ok: true; cookie: string; email: string } | { ok: false; status: number; error: string }> {
  const auth = getAuthAdmin();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    return { ok: false, status: 401, error: "Invalid sign-in. Please try again." };
  }
  if (!isAllowed(decoded.email)) {
    return { ok: false, status: 403, error: "This account is not authorized for admin access." };
  }
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  return { ok: true, cookie, email: decoded.email! };
}

// Auth gate for every admin page, server action, and the data layer.
// Redirects (rather than throws) so a stale session lands on the login page
// from any entry point. Wrapped in React cache() so a page + its data-layer
// calls verify the session cookie once per request, not once per call.
export const requireAdmin = cache(async (): Promise<{ email: string }> => {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) redirect("/admin/login");
  let email: string | undefined;
  try {
    const decoded = await getAuthAdmin().verifySessionCookie(value, true);
    email = decoded.email;
  } catch {
    redirect("/admin/login");
  }
  if (!isAllowed(email)) redirect("/admin/login");
  return { email: email! };
});
