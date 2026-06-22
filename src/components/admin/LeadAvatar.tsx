import { cn } from "@/lib/cn";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic tint per name — brand palette only (emerald + gold).
const TINTS = [
  "bg-emerald/10 text-emerald-deep ring-emerald/15",
  "bg-gold/15 text-[#7a611a] ring-gold/25",
  "bg-emerald-deep/[0.08] text-emerald-deep ring-emerald/20",
];

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function LeadAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-[11px]" : "h-11 w-11 text-sm";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset", dim, tintFor(name))}>
      {initials(name)}
    </span>
  );
}
