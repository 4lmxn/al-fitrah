import { cn } from "@/lib/cn";
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
