import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className = "",
}: {
  icon: string;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 p-16 text-center ${className}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
        <Icon name={icon} className="text-[30px]" />
      </span>
      <p className="font-display text-lg text-emerald-deep">{title}</p>
      {children && <p className="max-w-sm text-sm text-ink/50">{children}</p>}
      {action}
    </div>
  );
}
