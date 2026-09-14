import { cn } from "@/lib/cn";

export function Wave({
  fill = "#ffffff",
  flip = false,
  className,
}: {
  fill?: string;
  flip?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      className={cn("block h-[60px] w-full", flip && "-scale-y-100", className)}
    >
      <path
        d="M0,30 C150,60 300,0 450,25 C600,50 750,5 900,25 C1050,45 1150,20 1200,30 L1200,60 L0,60 Z"
        fill={fill}
      />
    </svg>
  );
}
