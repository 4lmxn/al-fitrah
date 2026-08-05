// Stage presentation.
//
// Colour is functional: it encodes pipeline progress as deepening emerald —
// gold "new" → faint → medium emerald → solid emerald "won" → muted neutral
// "lost". Strict brand palette, no decorative hues.
//
// Style is derived from the stage's GROUP and its position, never from a
// per-stage lookup table. Stages are configurable now, so a hardcoded map would
// leave every newly configured stage unstyled — the table could only ever
// describe the stages that shipped.

export type StageGroup = "new" | "active" | "won" | "lost";

export type StageStyle = {
  pill: string; // bg + text + ring for the status pill
  dot: string; // leading dot
};

const NEW: StageStyle = { pill: "bg-gold-soft text-[#7a611a] ring-gold/30", dot: "bg-gold" };
const FAINT: StageStyle = { pill: "bg-emerald/[0.06] text-emerald ring-emerald/15", dot: "bg-emerald/40" };
const MEDIUM: StageStyle = { pill: "bg-emerald/[0.12] text-emerald-deep ring-emerald/25", dot: "bg-emerald" };
const WON: StageStyle = { pill: "bg-emerald text-cream ring-emerald-deep", dot: "bg-gold-light" };
const LOST: StageStyle = { pill: "bg-ink/[0.04] text-ink/50 ring-ink/10", dot: "bg-ink/25" };

/**
 * Style for a stage.
 *
 * `activeIndex` is the stage's position among the ACTIVE stages only, which is
 * what makes the middle of a pipeline deepen as it progresses. The first active
 * stage stays faint; everything after it is medium. Pass -1 for non-active
 * groups, where position is irrelevant.
 */
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

/**
 * A stage resolved for rendering: configuration plus derived presentation.
 *
 * Plain, serialisable data. Settings are server-only and async, so the server
 * resolves stages once and hands this to client components rather than letting
 * them reach for configuration they cannot read.
 */
export type StageView = {
  id: string;
  label: string;
  group: StageGroup;
  terminal: boolean;
  pill: string;
  dot: string;
};

/** Fallback for a stage no longer in the configured pipeline (e.g. renamed). */
export function unknownStage(id: string): StageView {
  return {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    group: "active",
    terminal: false,
    ...FAINT,
  };
}

/** Look a stage up in a resolved pipeline, tolerating one that has been removed. */
export function findStage(stages: StageView[], id: string): StageView {
  return stages.find((s) => s.id === id) ?? unknownStage(id);
}
