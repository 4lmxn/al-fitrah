import { cn } from "@/lib/cn";
export function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return <section id={id} className={cn("py-20 sm:py-28", className)}>{children}</section>;
}
