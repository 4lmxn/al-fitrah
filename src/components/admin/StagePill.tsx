import { stageMeta } from "@/lib/stageMeta";
import { cn } from "@/lib/cn";

export function StagePill({ stage, className }: { stage: string; className?: string }) {
  const m = stageMeta(stage);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", m.pill, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
