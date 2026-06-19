import { Icon } from "./Icon";
import { cn } from "@/lib/cn";
export function EyebrowPill({ icon, children, className }: { icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-deep", className)}>
      {icon && <Icon name={icon} className="text-base" />}
      {children}
    </span>
  );
}
