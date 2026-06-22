export type LeadType = "admission_inquiry" | "staff_application";

export const PIPELINES: Record<LeadType, readonly string[]> = {
  admission_inquiry: ["new", "contacted", "toured", "enrolled", "closed"],
  staff_application: ["new", "reviewing", "interview", "hired", "rejected"],
};

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  admission_inquiry: "Admission inquiry",
  staff_application: "Staff application",
};

export function isValidStage(type: LeadType, stage: string): boolean {
  return PIPELINES[type]?.includes(stage) ?? false;
}

export function stageLabel(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
