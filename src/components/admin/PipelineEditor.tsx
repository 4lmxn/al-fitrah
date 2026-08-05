"use client";
import { useState } from "react";
import { savePipeline } from "@/app/admin/(dash)/settings/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { stageStyle, type StageGroup, type StageView } from "@/lib/stageMeta";
import { Icon } from "@/components/ui/Icon";

const GROUPS: { value: StageGroup; label: string; hint: string }[] = [
  { value: "new", label: "New", hint: "Just arrived, nobody has acted yet" },
  { value: "active", label: "In progress", hint: "Being worked on" },
  { value: "won", label: "Won", hint: "Admitted / hired" },
  { value: "lost", label: "Lost", hint: "Did not proceed" },
];

type Row = { id: string; label: string; group: StageGroup; terminal: boolean; isNew: boolean };

/** New stages get an id derived from the label; existing ids never change. */
function idFrom(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "stage";
}

export function PipelineEditor({
  type,
  label,
  stages,
}: {
  type: string;
  label: string;
  stages: StageView[];
}) {
  const [rows, setRows] = useState<Row[]>(
    stages.map((s) => ({ id: s.id, label: s.label, group: s.group, terminal: s.terminal, isNew: false })),
  );

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const move = (i: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev];
      const j = i + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <ActionForm action={savePipeline} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="label" value={label} />

      <ul className="space-y-2">
        {rows.map((r, i) => {
          const style = stageStyle(r.group, r.group === "active" ? rows.slice(0, i).filter((x) => x.group === "active").length : -1);
          return (
            <li key={`${r.id}-${i}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald/10 bg-cream/20 p-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.pill}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {r.label || "Untitled"}
              </span>

              <input type="hidden" name="stageId" value={r.id} />
              <input
                name="stageLabel"
                value={r.label}
                onChange={(e) => {
                  // Only a brand-new stage re-derives its id. Renaming an
                  // existing one must not change the id, or every lead sitting
                  // on it would point at a stage that no longer exists.
                  const patch: Partial<Row> = { label: e.target.value };
                  if (r.isNew) patch.id = idFrom(e.target.value);
                  update(i, patch);
                }}
                className="w-40 rounded-lg border border-emerald/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              />

              <select
                name="stageGroup"
                value={r.group}
                onChange={(e) => update(i, { group: e.target.value as StageGroup })}
                className="rounded-lg border border-emerald/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald"
              >
                {GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>

              <input type="hidden" name="stageTerminal" value={String(r.terminal)} />
              <label className="flex items-center gap-1.5 text-xs text-ink/60">
                <input
                  type="checkbox"
                  checked={r.terminal}
                  onChange={(e) => update(i, { terminal: e.target.checked })}
                  className="h-3.5 w-3.5 rounded accent-emerald"
                />
                Final
              </label>

              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="rounded p-1 text-ink/40 hover:bg-emerald/10 hover:text-emerald">
                  <Icon name="arrow_upward" className="text-[16px]" />
                </button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="rounded p-1 text-ink/40 hover:bg-emerald/10 hover:text-emerald">
                  <Icon name="arrow_downward" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove ${r.label}`}
                  className="rounded p-1 text-ink/40 hover:bg-red-50 hover:text-red-600"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </div>

              {!r.isNew && (
                <span className="w-full text-[10px] text-ink/35">
                  id: <code>{r.id}</code> — fixed, so renaming keeps existing leads attached
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { id: "", label: "", group: "active", terminal: false, isNew: true }])}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald ring-1 ring-inset ring-emerald/20 transition hover:bg-emerald/5"
        >
          <Icon name="add" className="text-[16px]" /> Add stage
        </button>
        <button type="submit" className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">
          Save pipeline
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-ink/45">
        &ldquo;Final&rdquo; stages are never chased — no follow-up reminders, and they never appear in
        Needs attention. Removing a stage does not delete the leads on it; they keep their stage and
        still open, but stop appearing in the pipeline filters.
      </p>
    </ActionForm>
  );
}
