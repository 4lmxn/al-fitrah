import type { Metadata } from "next";
import Link from "next/link";
import { requireParent } from "@/lib/parentAuth";
import { getSettings } from "@/lib/settings";
import { listForAudience } from "@/lib/resources";
import { Icon } from "@/components/ui/Icon";
import { ParentSignOut } from "@/components/portal/ParentSignOut";

export const metadata: Metadata = { title: "Resources", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function PortalResourcesPage() {
  await requireParent();
  const [{ school }, resources] = await Promise.all([
    getSettings(),
    listForAudience(["parents", "public"]),
  ]);

  return (
    <div className="min-h-[100dvh] bg-cream-deep/40">
      <header className="bg-emerald-deep text-cream">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <span className="flex items-center gap-2 font-display text-lg">
            <Icon name="mosque" className="text-[20px] text-gold-light" /> {school.name}
          </span>
          <ParentSignOut />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:text-emerald-deep"
        >
          <Icon name="arrow_back" className="text-[18px]" /> Back
        </Link>

        <h1 className="mt-4 font-display text-3xl text-emerald-deep">Resources</h1>
        <p className="mt-1 text-sm text-ink/55">
          Newsletters, forms and worksheets shared by the school.
        </p>

        {resources.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-emerald/10 bg-white/90 p-8 text-center text-sm text-ink/55 shadow-soft">
            Nothing shared with you yet.
          </p>
        ) : (
          <ul className="mt-7 space-y-3">
            {resources.map((r) => (
              <li key={r.id}>
                <a
                  href={r.publicUrl ?? `/api/resources/${r.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft transition hover:shadow-lift"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald/8 text-emerald-deep">
                    <Icon name="description" className="text-[22px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg text-emerald-deep">{r.title}</span>
                    {r.description && (
                      <span className="mt-0.5 block text-sm text-ink/60">{r.description}</span>
                    )}
                    <span className="mt-1 block text-xs text-ink/45">
                      {[r.category, r.classSection, fmtSize(r.sizeBytes)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <Icon name="download" className="shrink-0 text-[20px] text-emerald" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
