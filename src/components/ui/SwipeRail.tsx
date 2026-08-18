import { Children } from "react";
import { cn } from "@/lib/cn";

/**
 * A row of cards that swipes on phones and becomes a grid from `sm` up.
 *
 * Every card grid on this site was authored for desktop and simply collapsed to
 * one column on a phone, which turned the home page into thirteen screens of
 * scrolling against desktop's seven. Four stacked cards is roughly 1,600px of
 * vertical travel to read four short paragraphs.
 *
 * A carousel with a next button would hide three of those four behind taps, and
 * on a page whose job is persuasion that is the wrong three to hide. A snapping
 * rail keeps all of them in the document, uses the gesture people already make
 * on a phone, and — because the next card peeks in at the edge — actually shows
 * that there is more, which a button never does.
 *
 * No JavaScript: this is `overflow-x` and CSS scroll-snap.
 *
 * `label` is required because the rail is a focusable scroll region; a keyboard
 * user tabbing onto it needs to be told what they have landed on.
 */
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
  /** Columns once it stops being a rail. 1 keeps them stacked full-width. */
  cols?: 1 | 2 | 3 | 4;
  className?: string;
  /** Extra classes for each card wrapper — e.g. a narrower peek. */
  cardClassName?: string;
  /**
   * Per-item wrapper classes, by index. The wrapper is the grid item once the
   * rail becomes a grid, so a bento layout's column spans have to land here
   * rather than on the card inside it.
   */
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
      // Focusable so the rail can be scrolled by keyboard. A card whose content
      // is plain text has nothing tabbable inside it, so without this the region
      // is reachable by mouse and touch only.
      tabIndex={0}
      role="group"
      aria-label={label}
      className={cn(
        // Bleeds to the screen edge on a phone so a half-visible next card sits
        // at the boundary rather than inside a margin, which is what makes it
        // read as "swipe me" instead of "clipped".
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
            // 90% still leaves a visible sliver of the next card, but leaves a
            // readable measure inside it. At 82% the text column fell to ~230px,
            // about 28 characters a line, which is well under the 45–75 that
            // prose needs — the rail was cheaper to scroll and worse to read.
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
