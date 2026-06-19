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
  return <section id={id} data-testid={testId} className={cn("py-20 sm:py-28", className)}>{children}</section>;
}
