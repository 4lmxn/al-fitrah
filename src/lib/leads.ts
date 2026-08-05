export type LeadType = "admission_inquiry" | "staff_application";

// Pipelines and stage validation moved to configuration — see lib/pipelines.
// What remains here is genuinely structural: the two lead TYPES are baked into
// the data model and the routes, unlike the stages within them.

// Legacy → current stage aliases. The admission pipeline was renamed
// (toured→visited, enrolled→admitted, closed→lost); any lead saved before the
// rename is normalised on read so it still lands on a valid pipeline step.
export const STAGE_ALIASES: Record<string, string> = {
  toured: "visited",
  enrolled: "admitted",
  closed: "lost",
};

export function normalizeStage(stage: string): string {
  return STAGE_ALIASES[stage] ?? stage;
}

// Programs a parent can express interest in on the enquiry form.
export const PROGRAM_INTERESTS = ["Pre-KG", "Junior KG", "Senior KG"] as const;
export type ProgramInterest = (typeof PROGRAM_INTERESTS)[number];

// Where a lead came from. "website" is the plain enquiry form; the rest are set
// by specific capture surfaces (waitlist, prospectus magnet) or entered by staff.
export const LEAD_SOURCES = ["website", "waitlist", "prospectus", "walk-in", "phone", "referral", "whatsapp"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// Sources a staff member can pick when logging a lead by hand.
export const MANUAL_SOURCES = ["walk-in", "phone", "whatsapp", "referral"] as const;

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

