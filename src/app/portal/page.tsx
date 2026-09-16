import type { Metadata } from "next";
import Link from "next/link";
import { requireParent } from "@/lib/parentAuth";
import { getStudentsForParent } from "@/lib/portalQueries";
import { getSettings } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { ParentSignOut } from "@/components/portal/ParentSignOut";
import { CARD } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Your children", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await requireParent();
  const [{ school }, children] = await Promise.all([getSettings(), getStudentsForParent(session)]);

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
        <h1 className="font-display text-3xl text-emerald-deep">
          {children.length === 1 ? "Your child" : "Your children"}
        </h1>
        <p className="mt-1 text-sm text-ink/55">
          Fees, receipts and attendance for {children.length === 1 ? "your child" : "each child"} at the school.
        </p>

        <ul className="mt-7 space-y-4">
          {children.map((c) => (
            <li key={c.id}>
              <Link
                href={`/portal/${c.id}`}
                className={`${CARD} flex flex-wrap items-center gap-4 p-5 transition hover:shadow-lift`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald/8 font-display text-lg text-emerald-deep">
                  {c.fullName.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg text-emerald-deep">{c.fullName}</span>
                  <span className="block text-xs text-ink/45">
                    {c.program}
                    {c.classSection ? ` · ${c.classSection}` : ""} · {c.admissionNumber}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                    {c.balancePaise > 0 ? "Due" : "Fees"}
                  </span>
                  <span
                    className={`block tabular-nums font-semibold ${c.balancePaise > 0 ? "text-red-700" : "text-emerald-deep"}`}
                  >
                    {c.balancePaise > 0 ? formatPaise(c.balancePaise) : "Settled"}
                  </span>
                </span>
                <Icon name="arrow_forward" className="text-[18px] text-emerald" />
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/portal/resources"
          className={`${CARD} mt-4 flex items-center gap-4 p-5 transition hover:shadow-lift`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald/8 text-emerald-deep">
            <Icon name="folder_shared" className="text-[22px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg text-emerald-deep">Resources</span>
            <span className="block text-xs text-ink/45">Newsletters, forms and worksheets</span>
          </span>
          <Icon name="arrow_forward" className="text-[18px] text-emerald" />
        </Link>
      </main>
    </div>
  );
}
