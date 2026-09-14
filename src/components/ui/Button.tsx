import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  href?: string;
  variant?: "primary" | "outline" | "gold" | "coral" | "white";
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-base font-semibold " +
  "transition duration-150 hover:-translate-y-0.5 hover:-rotate-1 focus-visible:outline";

const variants = {
  primary: "bg-emerald text-cream shadow-[0_12px_22px_-12px_rgba(6,95,70,0.9)] hover:bg-emerald-dark",
  outline: "border-2 border-emerald bg-white text-emerald hover:bg-emerald/5",
  gold: "bg-gold text-ink shadow-[0_12px_22px_-12px_rgba(201,162,39,0.9)] hover:bg-gold-light",
  coral: "bg-coral text-white shadow-[0_12px_22px_-12px_rgba(238,127,130,0.9)] hover:brightness-105",
  white: "bg-white text-ink shadow-soft hover:bg-cream",
};

export function Button({ href, variant = "primary", className, children }: Props) {
  const cls = cn(base, variants[variant], className);
  return href ? <Link href={href} className={cls}>{children}</Link> : <button className={cls}>{children}</button>;
}
