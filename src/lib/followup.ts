import { waLink } from "@/lib/phone";
const FOLLOW_UP_TEMPLATE =
  "Assalamu alaikum {first}, this is Al Fitrah Pre School, Sarjapura. " +
  "Thank you for your interest in admissions for 2026–27. We'd love to help " +
  "you take the next step — would you like to visit the campus or ask us anything? " +
  "You're welcome any school day, 9:00 AM – 1:30 PM.";

function firstName(name: string): string {
  const n = name.trim().split(/\s+/)[0];
  return n && n !== "—" ? n : "there";
}

export function resolveFollowUp(
  dateRaw: string,
  offsetRaw: unknown,
  now = new Date(),
): Date | null | undefined {
  const raw = dateRaw.trim();
  if (raw === "clear") return null;

  const offset = Number(offsetRaw);
  if (Number.isFinite(offset) && offset > 0 && offset <= 90) {
    const t = new Date(now);
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + offset);
    return t;
  }

  if (!raw) return undefined;
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid follow-up date");
  return d;
}

export function followUpWaLink(phone: string, name: string): string | null {
  return waLink(phone, FOLLOW_UP_TEMPLATE.replace("{first}", firstName(name)));
}
