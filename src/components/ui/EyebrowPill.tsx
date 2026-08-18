import { Icon } from "./Icon";
import { cn } from "@/lib/cn";

/** Floating chip above a hero title — white, softly shadowed, slightly tilted. */
export function EyebrowPill({ icon, children, className }: { icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-1 items-center gap-2 rounded-full bg-white px-4 py-1.5 font-display text-sm font-semibold text-emerald-deep shadow-soft",
        className,
      )}
    >
      {icon && <Icon name={icon} className="text-base text-gold" />}
      {children}
    </span>
  );
}

/**
 * Section eyebrow — hand-lettered rather than the usual uppercase tracking-wide
 * label. Tilted a couple of degrees so it sits on the page like a note rather
 * than a form field.
 */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block -rotate-2 font-display text-lg font-semibold text-coral", className)}>
      {children}
    </span>
  );
}
