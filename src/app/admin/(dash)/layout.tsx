import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { Icon } from "@/components/ui/Icon";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { NavLink } from "@/components/admin/NavLink";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  {
    group: "Every day",
    links: [
      { href: "/admin", icon: "inbox", label: "Leads" },
      { href: "/admin/students", icon: "school", label: "Students" },
      { href: "/admin/attendance", icon: "fact_check", label: "Attendance" },
      { href: "/admin/fees", icon: "payments", label: "Fees" },
    ],
  },
  {
    group: "The school",
    links: [
      { href: "/admin/staff", icon: "badge", label: "Staff" },
      { href: "/admin/resources", icon: "folder_shared", label: "Resources" },
      { href: "/admin/content", icon: "article", label: "Website" },
      { href: "/admin/openings", icon: "work", label: "Careers" },
    ],
  },
  {
    group: "Oversight",
    links: [
      { href: "/admin/insights", icon: "insights", label: "Insights" },
      { href: "/admin/audit", icon: "history", label: "Activity" },
      { href: "/admin/settings", icon: "settings", label: "Settings" },
    ],
  },
];

export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-[100dvh] bg-cream-deep/40 lg:grid lg:grid-cols-[16rem_1fr]">
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

        <nav className="mt-9 space-y-6">
          {NAV.map((section) => (
            <div key={section.group}>
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-cream/40">
                {section.group}
              </span>
              {section.links.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>
          ))}
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

      <header className="bg-emerald text-cream lg:hidden">
        <div className="flex items-center justify-between px-5 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg">
            <Icon name="mosque" className="text-[20px] text-gold-light" /> Al Fitrah · Admin
          </Link>
          <LogoutButton />
        </div>
        <nav
          aria-label="Admin"
          className="flex gap-2 overflow-x-auto border-t border-cream/10 px-5 py-2 text-sm font-semibold"
        >
          {NAV.flatMap((section) => section.links).map((link) => (
            <NavLink key={link.href} {...link} variant="topbar" />
          ))}
        </nav>
      </header>

      <main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
