import { cn } from "@/lib/cn";
/**
 * Section rhythm.
 *
 * Mobile gets a much tighter pad than desktop. At the old flat `py-20` the home
 * page spent 1,440px — a fifth of its entire height on a phone — on the gaps
 * between sections alone.
 *
 * The default is responsive, which puts a trap in `cn`: it is a plain join, not
 * tailwind-merge, so a caller's bare `pt-0` sits outside the media query and
 * loses to `sm:py-20`. Every padding override passed to a Section therefore
 * needs an `sm:` twin — `pt-0 sm:pt-0`, not `pt-0`. There is a test that walks
 * the source and fails if one is missing.
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
  return <section id={id} data-testid={testId} className={cn("py-12 sm:py-20", className)}>{children}</section>;
}
