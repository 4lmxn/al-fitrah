"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { LeadRow, InboxKpis } from "@/lib/leadQueries";
import type { ActionResult } from "@/lib/actionResult";
import { type LeadType } from "@/lib/leads";
import { findStage, type StageView } from "@/lib/stageMeta";
import { needsAttention } from "@/lib/attention";
import { relativeTime } from "@/lib/relativeTime";
import { followUpWaLink } from "@/lib/followup";
import { updateStage, snoozeFollowUp } from "@/app/admin/(dash)/leads/[id]/actions";
import { bulkUpdateStage } from "@/app/admin/(dash)/leads/bulk-actions";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/admin/StatCard";
import { LeadAvatar } from "@/components/admin/LeadAvatar";
import { ActionForm } from "@/components/admin/ActionForm";
import { EmptyState } from "@/components/admin/EmptyState";
import { CARD } from "@/components/ui/styles";

type State = {
  rows: LeadRow[];
  counts: Record<string, number>;
  kpis: InboxKpis;
  attentionCount: number;
};

export function InboxBoard({
  type,
  activeStage,
  attention,
  q,
  wonLabel,
  stages,
  initial,
}: {
  type: LeadType;
  activeStage?: string;
  attention: boolean;
  q: string;
  wonLabel: string;
  stages: StageView[];
  initial: State;
}) {
  const [state, setState] = useState<State>(initial);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const { rows, counts, kpis, attentionCount } = state;

  const startTodayMs = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  const base = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ type, ...(q ? { q } : {}), ...extra });
    return `/admin?${params.toString()}`;
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allShownSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const markPending = (id: string, on: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  function applyChange(prev: State, before: LeadRow, after: LeadRow): State {
    const counts = { ...prev.counts };
    const kpis = { ...prev.kpis };

    if (before.stage !== after.stage) {
      if (before.stage in counts) counts[before.stage] -= 1;
      if (after.stage in counts) counts[after.stage] += 1;
      const g0 = findStage(stages, before.stage).group;
      const g1 = findStage(stages, after.stage).group;
      if (g0 !== g1) {
        kpis[g0] -= 1;
        kpis[g1] += 1;
      }
    }

    const attnDelta =
      (needsAttention(after) ? 1 : 0) - (needsAttention(before) ? 1 : 0);
    const attentionCount = prev.attentionCount + attnDelta;

    const stillVisible = attention
      ? needsAttention(after)
      : activeStage
        ? after.stage === activeStage
        : true;

    const rows = stillVisible
      ? prev.rows.map((r) => (r.id === after.id ? after : r))
      : prev.rows.filter((r) => r.id !== after.id);

    return { rows, counts, kpis, attentionCount };
  }

  function mutate(
    before: LeadRow,
    after: LeadRow,
    run: () => Promise<ActionResult>,
    failMsg: string,
  ) {
    const snapshot = state;
    setError(null);
    setState((prev) => applyChange(prev, before, after));
    markPending(before.id, true);
    startTransition(async () => {
      try {
        const result = await run();
        if (!result.ok) {
          setState(snapshot);
          setError(result.error);
        }
      } catch {
        setState(snapshot);
        setError(failMsg);
      } finally {
        markPending(before.id, false);
      }
    });
  }

  function onStage(row: LeadRow, next: string) {
    if (next === row.stage) return;
    const after: LeadRow = { ...row, stage: next, noteCount: row.noteCount + 1 };
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("stage", next);
    mutate(row, after, () => updateStage(fd), "Couldn't change stage — reverted. Try again.");
  }

  function onSnooze(row: LeadRow, days = 7) {
    const target = new Date();
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + days);
    const after: LeadRow = { ...row, followUpMs: target.getTime() };
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("days", String(days));
    mutate(row, after, () => snoozeFollowUp(fd), "Couldn't snooze — reverted. Try again.");
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-red-300/50 bg-red-50 px-5 py-3.5 text-sm text-red-800"
        >
          <Icon name="error" className="text-[20px]" />
          <span className="font-semibold">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto rounded-full px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald/20 bg-emerald/[0.04] px-5 py-3.5">
          <span className="text-sm font-semibold text-emerald-deep">
            {selected.size} selected
          </span>

          <ActionForm action={bulkUpdateStage} className="flex items-center gap-2">
            {[...selected].map((id) => (
              <input key={id} type="hidden" name="id" value={id} />
            ))}
            <input type="hidden" name="type" value={type} />
            <select
              name="stage"
              defaultValue=""
              className="rounded-lg border border-emerald/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-deep outline-none focus:border-emerald"
            >
              <option value="" disabled>Move to…</option>
              {stages.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <button type="submit" className="rounded-full bg-emerald px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-emerald-deep">
              Move
            </button>
          </ActionForm>

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-semibold text-ink/50 hover:text-ink"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={kpis.total} icon="groups" tone="brand" />
        <StatCard label="New" value={kpis.new} icon="mark_email_unread" tone="gold" hint="Awaiting first contact" />
        <StatCard label="In progress" value={kpis.active} icon="trending_up" tone="soft" />
        <StatCard label={wonLabel} value={kpis.won} icon="verified" tone="deep" />
      </div>

      <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {attentionCount > 0 && (
            <Link
              href={attention ? `/admin?type=${type}` : `/admin?type=${type}&view=attention`}
              title="Overdue follow-ups, and new enquiries nobody has touched"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                attention ? "bg-gold text-ink ring-gold" : "bg-white text-[#7a611a] ring-gold/30 hover:bg-gold-soft/50"
              }`}
            >
              <Icon name="notification_important" className="text-[14px]" /> Needs attention
              <span className="tabular-nums opacity-70">{attentionCount}</span>
            </Link>
          )}
          <Link
            href={base({})}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              !activeStage && !attention ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            All <span className="ml-1 tabular-nums opacity-70">{kpis.total}</span>
          </Link>
          {stages.map((m) => {
            const s = m.id;
            const active = activeStage === s;
            return (
              <Link
                key={s}
                href={base({ stage: s })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                  active ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                {m.label}
                <span className="tabular-nums opacity-70">{counts[s] ?? 0}</span>
              </Link>
            );
          })}
        </div>

        <form action="/admin" method="get" className="relative w-full lg:w-72">
          <input type="hidden" name="type" value={type} />
          {activeStage && <input type="hidden" name="stage" value={activeStage} />}
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink/35" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email…"
            className="w-full rounded-full border border-emerald/15 bg-white py-2.5 pl-10 pr-4 text-sm text-ink shadow-soft outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35"
          />
        </form>
      </div>

      <div className={`${CARD} mt-5 overflow-hidden`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={attention ? "task_alt" : q || activeStage ? "search_off" : "inbox"}
            title={attention ? "All caught up" : q || activeStage ? "No matching leads" : "No leads yet"}
            action={
              (q || activeStage || attention) && (
                <Link href={`/admin?type=${type}`} className="mt-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
                  {attention ? "Back to all leads" : "Clear filters"}
                </Link>
              )
            }
          >
            {attention
              ? "No overdue follow-ups or untouched enquiries. Nice work."
              : q || activeStage
                ? "Try clearing the filter or search."
                : "New submissions from the website will land here automatically."}
          </EmptyState>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className="border-b border-emerald/10 bg-cream/40 text-[11px] uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select every lead on this page"
                    checked={allShownSelected}
                    onChange={() => setSelected(allShownSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                    className="h-4 w-4 rounded accent-emerald"
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">{type === "staff_application" ? "Role" : "Child age"}</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">Phone</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">Received</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald/5">
              {rows.map((l) => {
                const busy = pendingIds.has(l.id);
                return (
                  <tr key={l.id} className={`group transition hover:bg-emerald/[0.035] ${busy ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${l.name}`}
                        checked={selected.has(l.id)}
                        onChange={() => toggle(l.id)}
                        className="h-4 w-4 rounded accent-emerald"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/leads/${l.id}`} className="flex items-center gap-3">
                        <LeadAvatar name={l.name} />
                      {l.possibleDuplicateOf && (
                        <span title="Possible duplicate of an earlier enquiry" className="shrink-0 text-gold">
                          <Icon name="content_copy" className="text-[14px]" />
                        </span>
                      )}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-emerald-deep">{l.name}</span>
                          <span className="block truncate text-xs text-ink/45">
                          {l.email ?? "No email"}
                        </span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-5 py-3.5 text-ink/70 sm:table-cell">{type === "staff_application" ? l.role ?? "—" : l.childAge ?? "—"}</td>
                    <td className="hidden px-5 py-3.5 text-ink/70 md:table-cell tabular-nums">{l.phone}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={l.stage}
                        aria-label="Change stage"
                        disabled={busy}
                        onChange={(e) => onStage(l, e.target.value)}
                        className="cursor-pointer rounded-full border border-emerald/15 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-emerald-deep outline-none transition hover:bg-emerald/5 focus:border-emerald focus:ring-2 focus:ring-emerald/20 disabled:cursor-wait"
                      >
                        {stages.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="hidden px-5 py-3.5 sm:table-cell">
                      <div className="text-ink/55">{relativeTime(l.createdAtMs)}</div>
                      {l.followUpMs != null && (
                        <div className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${l.followUpMs < startTodayMs ? "text-[#9a7b18]" : "text-emerald"}`}>
                          <Icon name={l.followUpMs < startTodayMs ? "notification_important" : "event"} className="text-[13px]" />
                          {l.followUpMs < startTodayMs ? "Overdue" : "Follow-up"} {relativeTime(l.followUpMs)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {type === "admission_inquiry" && (() => {
                          const wa = followUpWaLink(l.phone, l.name);
                          return wa ? (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Send a WhatsApp follow-up"
                              aria-label={`Send a WhatsApp follow-up to ${l.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-emerald transition hover:bg-emerald/10"
                            >
                              <Icon name="chat" className="text-[18px]" />
                            </a>
                          ) : null;
                        })()}
                        {l.followUpMs != null && l.followUpMs < startTodayMs && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onSnooze(l, 7)}
                            title="Snooze follow-up by a week"
                            aria-label={`Snooze ${l.name} by a week`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/45 transition hover:bg-emerald/10 hover:text-emerald disabled:cursor-wait"
                          >
                            <Icon name="snooze" className="text-[18px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-3 text-xs text-ink/45">Showing {rows.length} {rows.length === 1 ? "lead" : "leads"}{attention ? " needing attention" : activeStage ? ` in ${findStage(stages, activeStage).label}` : ""}{q ? ` matching “${q}”` : ""}.</p>
      )}
    </>
  );
}
