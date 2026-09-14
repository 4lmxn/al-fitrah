import "server-only";
import { getSettings } from "@/lib/settings";

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

export function pickFrom(list: string[], value: string | null | undefined): string | null {
  if (!value) return null;
  const match = list.find((v) => v.toLowerCase() === value.toLowerCase());
  return match ?? null;
}
