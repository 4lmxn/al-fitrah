import "server-only";

export type Role = "owner" | "staff";

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

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().includes(email.toLowerCase());
}

export function roleFor(email: string | null | undefined): Role {
  if (!email) return "staff";
  const owners = getOwners();
  if (owners.length === 0) return "owner";
  return owners.includes(email.toLowerCase()) ? "owner" : "staff";
}
