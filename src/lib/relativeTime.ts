export function relativeTime(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type DateStyle = "day" | "medium" | "long" | "full" | "datetime";

const DATE_FORMAT: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  day: { day: "numeric", month: "short" },
  medium: { dateStyle: "medium" },
  long: { dateStyle: "long" },
  full: { dateStyle: "full" },
  datetime: { dateStyle: "medium", timeStyle: "short" },
};

export function formatDate(ms: number | null, style: DateStyle = "medium", empty = "—"): string {
  if (!ms) return empty;
  return new Date(ms).toLocaleString("en-IN", DATE_FORMAT[style]);
}
