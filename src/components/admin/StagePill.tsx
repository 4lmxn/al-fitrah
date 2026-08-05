import { findStage, type StageView } from "@/lib/stageMeta";
import { cn } from "@/lib/cn";

/**
 * Status pill for a stage.
 *
 * Takes the resolved pipeline rather than looking a stage up itself: stages are
 * configuration now, and configuration is server-only and async. The caller
 * already has the pipeline, so passing it keeps this a plain render.
 */
export function StagePill({ stage, stages, className }: { stage: string; stages: StageView[]; className?: string }) {
  const m = findStage(stages, stage);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", m.pill, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
