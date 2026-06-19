import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  href?: string;
  variant?: "primary" | "outline" | "gold";
  className?: string;
  children: React.ReactNode;
};

const base = "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline";
const variants = {
  primary: "bg-emerald text-cream hover:bg-emerald-dark",
  outline: "border border-emerald/30 text-emerald hover:bg-emerald/5",
  gold: "bg-gold text-ink hover:bg-gold-light",
};

export function Button({ href, variant = "primary", className, children }: Props) {
  const cls = cn(base, variants[variant], className);
  return href ? <Link href={href} className={cls}>{children}</Link> : <button className={cls}>{children}</button>;
}
