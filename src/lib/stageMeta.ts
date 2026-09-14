export type StageGroup = "new" | "active" | "won" | "lost";

export type StageStyle = {
  pill: string;
  dot: string;
};

const NEW: StageStyle = { pill: "bg-gold-soft text-[#7a611a] ring-gold/30", dot: "bg-gold" };
const FAINT: StageStyle = { pill: "bg-emerald/[0.06] text-emerald ring-emerald/15", dot: "bg-emerald/40" };
const MEDIUM: StageStyle = { pill: "bg-emerald/[0.12] text-emerald-deep ring-emerald/25", dot: "bg-emerald" };
const WON: StageStyle = { pill: "bg-emerald text-cream ring-emerald-deep", dot: "bg-gold-light" };
const LOST: StageStyle = { pill: "bg-ink/[0.04] text-ink/50 ring-ink/10", dot: "bg-ink/25" };

export function stageStyle(group: StageGroup, activeIndex = -1): StageStyle {
  switch (group) {
    case "new":
      return NEW;
    case "won":
      return WON;
    case "lost":
      return LOST;
    default:
      return activeIndex <= 0 ? FAINT : MEDIUM;
  }
}

export type StageView = {
  id: string;
  label: string;
  group: StageGroup;
  terminal: boolean;
  pill: string;
  dot: string;
};

export function unknownStage(id: string): StageView {
  return {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    group: "active",
    terminal: false,
    ...FAINT,
  };
}

export function findStage(stages: StageView[], id: string): StageView {
  return stages.find((s) => s.id === id) ?? unknownStage(id);
}
