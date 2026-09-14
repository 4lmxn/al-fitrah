import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthAdmin } from "@/lib/firebaseAdmin";
import { isAllowed, roleFor, type Role } from "@/lib/roles";

export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export { getAllowlist, isAllowed } from "@/lib/roles";

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

export const getAdmin = cache(async (): Promise<{ email: string; role: Role } | null> => {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const decoded = await getAuthAdmin().verifySessionCookie(value, true);
    if (!isAllowed(decoded.email)) return null;
    return { email: decoded.email!, role: roleFor(decoded.email) };
  } catch {
    return null;
  }
});

export const requireAdmin = cache(async (): Promise<{ email: string; role: Role }> => {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
});

export async function requireOwner(): Promise<{ email: string; role: Role }> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") {
    console.warn(`blocked: ${admin.email} (staff) attempted an owner-only action`);
    throw new Error("This action needs an owner account.");
  }
  return admin;
}
