import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/firebaseAdmin";

export type Role = "owner" | "staff";

export type RosterEntry = { email: string; role: Role };

export const ROSTER_COLLECTION = "access";
export const ROSTER_DOC = "roster";

function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowlist(): string[] {
  return parseList(process.env.ADMIN_EMAILS);
}

export function getOwners(): string[] {
  return parseList(process.env.ADMIN_OWNERS);
}

export function resolveAllowlist(envAllow: string[], roster: RosterEntry[] | null): string[] {
  const emails = [...envAllow, ...(roster ?? []).map((r) => r.email.trim().toLowerCase())];
  return [...new Set(emails.filter(Boolean))].sort();
}

export function resolveRole(
  email: string | null | undefined,
  envOwners: string[],
  roster: RosterEntry[] | null,
): Role {
  if (!email) return "staff";
  const key = email.trim().toLowerCase();
  if (envOwners.includes(key)) return "owner";
  if (roster === null) return "staff";
  const rosterOwners = roster.filter((r) => r.role === "owner").map((r) => r.email.trim().toLowerCase());
  if (envOwners.length === 0 && rosterOwners.length === 0) return "owner";
  return rosterOwners.includes(key) ? "owner" : "staff";
}

export const getRoster = cache(async (): Promise<RosterEntry[] | null> => {
  try {
    const doc = await getDb().collection(ROSTER_COLLECTION).doc(ROSTER_DOC).get();
    const members = doc.exists ? doc.data()?.members : null;
    if (!Array.isArray(members)) return [];
    return members
      .filter((m) => m && typeof m.email === "string")
      .map((m) => ({ email: String(m.email).toLowerCase(), role: m.role === "owner" ? "owner" : "staff" }));
  } catch (err) {
    console.error("roster read failed", err);
    return null;
  }
});

export async function listAdminEmails(): Promise<string[]> {
  return resolveAllowlist(getAllowlist(), await getRoster());
}

export async function isAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return (await listAdminEmails()).includes(email.toLowerCase());
}

export async function roleFor(email: string | null | undefined): Promise<Role> {
  return resolveRole(email, getOwners(), await getRoster());
}
