import { cn } from "@/lib/cn";
/**
 * Section rhythm. The default pad is deliberately not responsive: `cn` is a
 * plain join, so a caller's `pt-0` only wins because Tailwind emits `pt-*`
 * after `py-*` — a `sm:py-*` default would sit in a media query and beat it.
 * Override with `pt-*`/`pb-*`, never with another `py-*`.
 */
export function Section({
  id,
  className,
  children,
  "data-testid": testId,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return <section id={id} data-testid={testId} className={cn("py-20", className)}>{children}</section>;
}
