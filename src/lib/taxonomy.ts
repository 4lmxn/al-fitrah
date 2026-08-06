import "server-only";
import { getSettings } from "@/lib/settings";

/**
 * Configured lists, replacing the constants they were.
 *
 * Server-only and async, because settings are. Client components receive the
 * resolved list as a prop rather than importing it — the same boundary the
 * pipeline migration established.
 *
 * All of these are one cached settings read; calling several in a page costs
 * nothing extra.
 */
export async function getPrograms(): Promise<string[]> {
  return (await getSettings()).taxonomy.programs;
}

export async function getClassSections(): Promise<string[]> {
  return (await getSettings()).taxonomy.classSections;
}

export async function getLeadSources(): Promise<string[]> {
  return (await getSettings()).taxonomy.leadSources;
}

export async function getManualLeadSources(): Promise<string[]> {
  return (await getSettings()).taxonomy.manualLeadSources;
}

export async function getEmploymentTypes(): Promise<string[]> {
  return (await getSettings()).taxonomy.employmentTypes;
}

export async function getPaymentMethods(): Promise<string[]> {
  return (await getSettings()).taxonomy.paymentMethods;
}

export async function getLeadTags(): Promise<string[]> {
  return (await getSettings()).taxonomy.leadTags;
}

export type AttendanceStatusConfig = { id: string; label: string; present: boolean; counted: boolean };

export async function getAttendanceStatuses(): Promise<AttendanceStatusConfig[]> {
  return (await getSettings()).attendance.statuses;
}

/**
 * Validate a submitted value against a configured list.
 *
 * Replaces the compile-time `z.enum(CONSTANT)` checks. Those could only ever
 * accept the values that shipped, so a school adding a program would have had
 * its own enquiry form rejected by its own server.
 *
 * Falls back to the first configured value rather than erroring for optional
 * fields, and returns null when there is nothing sensible to pick.
 */
export function pickFrom(list: string[], value: string | null | undefined): string | null {
  if (!value) return null;
  const match = list.find((v) => v.toLowerCase() === value.toLowerCase());
  return match ?? null;
}
