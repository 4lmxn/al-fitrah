import { cn } from "@/lib/cn";
export function Icon({ name, className }: { name: string; className?: string }) {
  return <span aria-hidden className={cn("material-symbols-outlined", className)}>{name}</span>;
}
