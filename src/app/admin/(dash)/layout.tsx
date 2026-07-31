import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { Icon } from "@/components/ui/Icon";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

// Admin console must never be indexed.
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-[100dvh] bg-cream-deep/40 lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar (desktop) — solid brand emerald with geometric texture */}
      <aside className="bg-geo-on-emerald sticky top-0 hidden h-[100dvh] flex-col border-r-2 border-gold/30 bg-emerald-deep p-5 text-cream lg:flex">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream/10 ring-1 ring-gold/30">
            <Icon name="mosque" className="text-[22px] text-gold-light" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg">Al Fitrah</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-gold-light/70">Admin Console</span>
          </span>
        </Link>

        <nav className="mt-9 space-y-1">
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-cream/40">Workspace</span>
          <Link
            href="/admin"
            className="mt-1 flex items-center gap-3 rounded-xl border-l-2 border-gold bg-cream/10 px-3 py-2.5 text-sm font-semibold ring-1 ring-cream/10"
          >
            <Icon name="inbox" className="text-[20px] text-gold-light" /> Leads
          </Link>
          <Link
            href="/admin/openings"
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-cream/80 transition hover:bg-cream/10"
          >
            <Icon name="work" className="text-[20px] text-gold-light" /> Careers
          </Link>
        </nav>

        <div className="mt-auto rounded-2xl bg-cream/5 p-4 ring-1 ring-cream/10">
          <div className="flex items-center gap-2 text-xs text-cream/60">
            <Icon name="account_circle" className="text-[18px]" />
            <span className="truncate">{admin.email}</span>
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="bg-emerald text-cream lg:hidden">
        <div className="flex items-center justify-between px-5 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg">
            <Icon name="mosque" className="text-[20px] text-gold-light" /> Al Fitrah · Admin
          </Link>
          <LogoutButton />
        </div>
        <nav aria-label="Admin" className="flex gap-2 border-t border-cream/10 px-5 py-2 text-sm font-semibold">
          <Link href="/admin" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-cream/10">
            <Icon name="inbox" className="text-[18px] text-gold-light" /> Dashboard
          </Link>
          <Link href="/admin/openings" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-cream/10">
            <Icon name="work" className="text-[18px] text-gold-light" /> Openings
          </Link>
        </nav>
      </header>

      <main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
