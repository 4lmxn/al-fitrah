import { Children } from "react";
import { cn } from "@/lib/cn";

export function SwipeRail({
  children,
  label,
  cols = 3,
  className,
  cardClassName,
  itemClassName,
}: {
  children: React.ReactNode;
  label: string;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
  cardClassName?: string;
  itemClassName?: (index: number) => string;
}) {
  const grid = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={label}
      className={cn(
        "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-3",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "sm:mx-0 sm:grid sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0",
        grid,
        className,
      )}
    >
      {Children.map(children, (child, i) => (
        <div
          key={i}
          className={cn(
            "w-[90%] shrink-0 snap-start sm:w-auto",
            cardClassName,
            itemClassName?.(i),
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
