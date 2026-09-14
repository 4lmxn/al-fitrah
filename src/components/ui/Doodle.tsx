import { cn } from "@/lib/cn";

export type DoodleKind =
  | "sun" | "star" | "sparkle" | "cloud" | "kite"
  | "crescent" | "heart" | "leaf" | "dot" | "book" | "rainbow";

const shapes: Record<DoodleKind, (color: string) => React.ReactElement> = {
  sun: (c) => (
    <svg viewBox="0 0 100 100" fill="none">
      <g className="origin-center animate-spin-slow" stroke={c} strokeWidth="6" strokeLinecap="round">
        <line x1="50" y1="6" x2="50" y2="20" /><line x1="50" y1="80" x2="50" y2="94" />
        <line x1="6" y1="50" x2="20" y2="50" /><line x1="80" y1="50" x2="94" y2="50" />
        <line x1="18" y1="18" x2="28" y2="28" /><line x1="72" y1="72" x2="82" y2="82" />
        <line x1="18" y1="82" x2="28" y2="72" /><line x1="72" y1="28" x2="82" y2="18" />
      </g>
      <circle cx="50" cy="50" r="19" fill={c} />
    </svg>
  ),
  star: (c) => (
    <svg viewBox="0 0 24 24" fill={c}>
      <path d="M12 2l1.9 5.2L19 8l-4 3.4 1.4 5.6L12 14l-4.4 3 1.4-5.6L5 8l5.1-.8z" />
    </svg>
  ),
  sparkle: (c) => (
    <svg viewBox="0 0 24 24" fill={c}>
      <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" />
    </svg>
  ),
  cloud: (c) => (
    <svg viewBox="0 0 64 64" fill={c}>
      <path d="M20 40a16 16 0 1116 16H20a12 12 0 010-16z" />
    </svg>
  ),
  kite: (c) => (
    <svg viewBox="0 0 40 80" fill="none">
      <path d="M20 4l14 18-14 18L6 22z" fill={c} />
      <line x1="20" y1="40" x2="20" y2="76" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  ),
  crescent: (c) => (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M32 6c-9 6-13 13-13 22a13 13 0 0026 0c0-9-4-16-13-22z" fill={c} />
      <circle cx="44" cy="18" r="4" fill="#fff" />
    </svg>
  ),
  heart: (c) => (
    <svg viewBox="0 0 24 24" fill={c}>
      <path d="M12 21s-7-4.3-9.3-9C1.4 9 3 6 6 6c1.8 0 3.2 1 4 2 .8-1 2.2-2 4-2 3 0 4.6 3 3.3 6C19 16.7 12 21 12 21z" />
    </svg>
  ),
  leaf: (c) => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 21c0-6 0-9 0-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 9c-3 0-5-2-5-5 3 0 5 2 5 5zM12 9c3 0 5-2 5-4-3 0-5 1-5 4z" fill={c} />
    </svg>
  ),
  dot: (c) => (
    <svg viewBox="0 0 24 24" fill={c}><circle cx="12" cy="12" r="6" /></svg>
  ),
  book: (c) => (
    <svg viewBox="0 0 24 24" fill={c}>
      <path d="M4 5c2-1 5-1 8 0v14c-3-1-6-1-8 0V5zm16 0c-2-1-5-1-8 0v14c3-1 6-1 8 0V5z" />
    </svg>
  ),
  rainbow: () => (
    <svg viewBox="0 0 120 70" fill="none" strokeWidth="9" strokeLinecap="round">
      <path d="M10 64a50 50 0 01100 0" stroke="#ee7f82" />
      <path d="M24 64a36 36 0 0172 0" stroke="#c9a227" />
      <path d="M38 64a22 22 0 0144 0" stroke="#7cc15e" />
      <path d="M50 64a10 10 0 0120 0" stroke="#065f46" />
    </svg>
  ),
};

const motions = {
  bob: "animate-bob",
  bob2: "animate-bob2",
  sway: "animate-sway origin-top",
  twinkle: "animate-twinkle",
  none: "",
} as const;

export function Doodle({
  kind,
  color = "#c9a227",
  motion = "bob",
  className,
}: {
  kind: DoodleKind;
  color?: string;
  motion?: keyof typeof motions;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-0 block text-current [&>svg]:h-auto [&>svg]:w-full",
        motions[motion],
        className,
      )}
      style={{ color }}
    >
      {shapes[kind](color)}
    </span>
  );
}
