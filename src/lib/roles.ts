import "server-only";

/**
 * Admin roles.
 *
 * Until now every authorised address had identical rights: the receptionist
 * logging a phone call could delete a job opening or read any applicant's CV,
 * with no audit trail. Two roles is the smallest split that fixes the part
 * that actually matters — who can destroy things.
 *
 * Roles come from env, not Firebase custom claims. Claims are the right answer
 * when roles are assigned through a UI by people who can't redeploy; here the
 * admin list is three or four addresses that change once a year, and env
 * variables need no migration, no claim-setting script, and no risk of a user
 * whose token predates their role change.
 *
 * ponytail: move to custom claims if staff ever need to manage roles themselves,
 * or if the list outgrows an env var.
 */
export type Role = "owner" | "staff";

function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Everyone permitted to sign in at all. */
export function getAllowlist(): string[] {
  return parseList(process.env.ADMIN_EMAILS);
}

/** Subset of the allowlist permitted to delete things. */
export function getOwners(): string[] {
  return parseList(process.env.ADMIN_OWNERS);
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().includes(email.toLowerCase());
}

/**
 * An allowed address is `owner` when it is listed in ADMIN_OWNERS.
 *
 * If ADMIN_OWNERS is unset, every allowed address is an owner. That keeps the
 * deploy that introduces roles from locking the school out of its own console
 * before anyone has set the new variable — the failure mode of a too-clever
 * default here is "nobody can delete anything and nobody knows why".
 */
export function roleFor(email: string | null | undefined): Role {
  if (!email) return "staff";
  const owners = getOwners();
  if (owners.length === 0) return "owner";
  return owners.includes(email.toLowerCase()) ? "owner" : "staff";
}
