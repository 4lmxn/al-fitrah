"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { LeadAvatar } from "@/components/admin/LeadAvatar";
import { updateStage } from "@/app/admin/(dash)/leads/[id]/actions";
import { findStage, type StageView } from "@/lib/stageMeta";
import type { BoardColumn } from "@/lib/leadQueries";
import type { LeadRow } from "@/lib/leadQueries";
import type { LeadType } from "@/lib/leads";
import { waLink } from "@/lib/phone";

export function LeadBoard({
  type,
  columns: initial,
  stages,
  q,
}: {
  type: LeadType;
  columns: BoardColumn[];
  stages: StageView[];
  q: string;
}) {
  const [columns, setColumns] = useState(initial);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const startOfToday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  function move(row: LeadRow, to: string) {
    if (to === row.stage) return;
    const snapshot = columns;
    setError(null);

    setColumns((prev) =>
      prev.map((c) => {
        if (c.stage === row.stage) {
          return { ...c, total: c.total - 1, rows: c.rows.filter((r) => r.id !== row.id) };
        }
        if (c.stage === to) {
          return { ...c, total: c.total + 1, rows: [{ ...row, stage: to }, ...c.rows] };
        }
        return c;
      }),
    );

    setPending((p) => new Set(p).add(row.id));
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", row.id);
        fd.set("stage", to);
        const result = await updateStage(fd);
        if (!result.ok) {
          setColumns(snapshot);
          setError(result.error ?? "Couldn't move that card — put it back.");
        }
      } catch {
        setColumns(snapshot);
        setError("Couldn't move that card — put it back.");
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(row.id);
          return next;
        });
      }
    });
  }

  return (
    <div className="mt-6">
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Columns scroll sideways as a group. This is the one place a horizontal
          scroll is right: a pipeline is a sequence, and squashing six stages
          into a phone's width would make every card unreadable. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-3">
          {columns.map((col) => {
            const meta = findStage(stages, col.stage);
            const hidden = col.total - col.rows.length;
            return (
              <section key={col.stage} className="flex w-72 shrink-0 flex-col">
                <header className="flex items-center justify-between rounded-t-2xl border border-b-0 border-emerald/10 bg-white/90 px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                    <span className="text-sm font-semibold text-emerald-deep">{meta.label}</span>
                  </span>
                  <span className="rounded-full bg-emerald/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-deep">
                    {col.total}
                  </span>
                </header>

                <div className="flex-1 space-y-2 rounded-b-2xl border border-emerald/10 bg-cream/30 p-2">
                  {col.rows.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-ink/35">Nothing here</p>
                  )}

                  {col.rows.map((row) => {
                    const overdue = row.followUpMs !== null && row.followUpMs < startOfToday;
                    const wa = waLink(row.phone);
                    return (
                      <article
                        key={row.id}
                        className={`rounded-xl border border-emerald/10 bg-white p-3 shadow-soft transition ${
                          pending.has(row.id) ? "opacity-50" : "hover:border-emerald/25"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <LeadAvatar name={row.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/admin/leads/${row.id}`}
                              className="block truncate text-sm font-semibold text-emerald-deep hover:text-emerald"
                            >
                              {row.name}
                            </Link>
                            {row.childName && (
                              <p className="truncate text-xs text-ink/50">
                                {row.childName}
                                {row.childAge ? ` · ${row.childAge}` : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        {(row.programInterest || row.source || overdue) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {row.programInterest && (
                              <span className="rounded-md bg-emerald/8 px-1.5 py-0.5 text-[11px] font-medium text-emerald-deep">
                                {row.programInterest}
                              </span>
                            )}
                            {row.source && (
                              <span className="rounded-md bg-ink/5 px-1.5 py-0.5 text-[11px] text-ink/55">
                                {row.source}
                              </span>
                            )}
                            {overdue && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                                <Icon name="schedule" className="text-[12px]" />
                                Overdue
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center gap-1.5">
                          <a
                            href={`tel:${row.phone}`}
                            className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald/8 text-xs font-semibold text-emerald-deep transition hover:bg-emerald/15"
                          >
                            <Icon name="call" className="text-[14px]" />
                            Call
                          </a>
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald/8 text-xs font-semibold text-emerald-deep transition hover:bg-emerald/15"
                            >
                              <Icon name="chat" className="text-[14px]" />
                              WhatsApp
                            </a>
                          )}
                        </div>

                        {/* Moving a card. A select rather than a drag handle:
                            it works with a thumb, a mouse and a keyboard, and
                            it announces itself to a screen reader. */}
                        <label className="mt-2 block">
                          <span className="sr-only">Move {row.name} to another stage</span>
                          <select
                            value={row.stage}
                            disabled={pending.has(row.id)}
                            onChange={(e) => move(row, e.target.value)}
                            className="w-full rounded-lg border border-emerald/15 bg-cream/40 px-2 py-1.5 text-xs font-medium text-ink/70 outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 disabled:opacity-50"
                          >
                            {stages.map((s) => (
                              <option key={s.id} value={s.id}>
                                Move to {s.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    );
                  })}

                  {hidden > 0 && (
                    <Link
                      href={`/admin?${new URLSearchParams({ type, stage: col.stage, ...(q ? { q } : {}) })}`}
                      className="block rounded-xl border border-dashed border-emerald/20 px-3 py-2.5 text-center text-xs font-semibold text-emerald hover:bg-emerald/5"
                    >
                      +{hidden} more — open as a list
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
