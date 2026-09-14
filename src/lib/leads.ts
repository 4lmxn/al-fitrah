export type LeadType = "admission_inquiry" | "staff_application";

const STAGE_ALIASES: Record<string, string> = {
  toured: "visited",
  enrolled: "admitted",
  closed: "lost",
};

export function normalizeStage(stage: string): string {
  return STAGE_ALIASES[stage] ?? stage;
}

export const SOURCE_LABEL: Record<string, string> = {
  website: "Website form",
  waitlist: "Waitlist",
  prospectus: "Prospectus",
  "walk-in": "Walk-in",
  phone: "Phone call",
  referral: "Referral",
  whatsapp: "WhatsApp",
};

export function sourceLabel(source?: string | null): string {
  if (!source) return "—";
  return SOURCE_LABEL[source] ?? source;
}

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  admission_inquiry: "Admission inquiry",
  staff_application: "Staff application",
};

