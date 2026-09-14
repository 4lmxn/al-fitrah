"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/leads");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  icon,
  label,
  variant = "sidebar",
}: {
  href: string;
  icon: string;
  label: string;
  variant?: "sidebar" | "topbar";
}) {
  const active = isActive(usePathname(), href);

  if (variant === "topbar") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
          active ? "bg-cream/15 text-cream" : "text-cream/75 hover:bg-cream/10"
        }`}
      >
        <Icon name={icon} className="text-[18px] text-gold-light" /> {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-l-2 border-gold bg-cream/10 text-cream ring-1 ring-cream/10"
          : "text-cream/80 hover:bg-cream/10"
      }`}
    >
      <Icon name={icon} className="text-[20px] text-gold-light" /> {label}
    </Link>
  );
}
