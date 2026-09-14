import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { listAudit, recentActors, RETENTION_DAYS } from "@/lib/audit";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const ENTITY_HREF: Record<string, (id: string) => string | null> = {
  lead: (id) => `/admin/leads/${id}`,
  student: (id) => (id === "bulk" ? null : `/admin/students/${id}`),
  post: (id) => `/admin/content/${id}`,
  opening: (id) => `/admin/openings/${id}`,
  settings: () => "/admin/settings",
  attendance: () => "/admin/attendance",
};

const ACTION_ICON: Record<string, string> = {
  payment: "payments",
  fee: "payments",
  lead: "inbox",
  student: "school",
  post: "article",
  opening: "work",
  settings: "settings",
  attendance: "fact_check",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; type?: string; id?: string; after?: string }>;
}) {
  const sp = await searchParams;
  const [{ role }, { entries, nextCursor }, actors] = await Promise.all([
    requireAdmin(),
    listAudit({ actor: sp.actor, entityType: sp.type, entityId: sp.id, cursor: sp.after }),
    recentActors(),
  ]);

  if (role !== "owner") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-emerald-deep">Activity log</h1>
        <p className="mt-4 rounded-2xl border border-gold/30 bg-gold-soft/40 px-5 py-4 text-sm text-[#7a611a]">
          The activity log records who changed what across the whole platform, so it is limited to
          owner accounts.
        </p>
      </div>
    );
  }

  const href = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ ...(sp.actor ? { actor: sp.actor } : {}), ...extra });
    return `/admin/audit${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Compliance</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Activity log</h1>
        <p className="mt-1 text-sm text-ink/55">
          Every change to a lead, student, payment, post or setting — who made it and when.
        </p>
      </div>

      {actors.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin/audit"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              !sp.actor ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            Everyone
          </Link>
          {actors.map((a) => (
            <Link
              key={a}
              href={`/admin/audit?actor=${encodeURIComponent(a)}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                sp.actor === a ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
              }`}
            >
              {a.split("@")[0]}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-emerald/10 bg-white/90 shadow-soft">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
              <Icon name="history" className="text-[30px]" />
            </span>
            <p className="font-display text-lg text-emerald-deep">Nothing recorded yet</p>
            <p className="max-w-sm text-sm text-ink/50">
              Changes made from the console appear here as they happen.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-emerald/5">
            {entries.map((e) => {
              const domain = e.action.split(".")[0];
              const link = ENTITY_HREF[e.entity.type]?.(e.entity.id) ?? null;
              return (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/8 text-emerald">
                    <Icon name={ACTION_ICON[domain] ?? "bolt"} className="text-[16px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink/85">
                      {link ? (
                        <Link href={link} className="font-semibold text-emerald-deep hover:text-emerald">
                          {e.summary}
                        </Link>
                      ) : (
                        <span className="font-semibold text-emerald-deep">{e.summary}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      {e.actor} · {relativeTime(e.atMs)} ·{" "}
                      <code className="rounded bg-emerald/5 px-1 py-0.5 text-[10px]">{e.action}</code>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-ink/45">
        Entries are kept for {Math.round(RETENTION_DAYS / 365)} years and cannot be edited or deleted.
      </p>

      {(nextCursor || sp.after) && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
          {sp.after ? (
            <Link href={href({})} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5">
              <Icon name="first_page" className="text-[18px]" /> Latest
            </Link>
          ) : (
            <span />
          )}
          {nextCursor && (
            <Link href={href({ after: nextCursor })} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5">
              Older <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
