// One place to edit the follow-up WhatsApp copy staff send from the console.
// {first} is replaced with the lead's first name.
export const FOLLOW_UP_TEMPLATE =
  "Assalamu alaikum {first}, this is Al Fitrah Pre School, Sarjapura. " +
  "Thank you for your interest in admissions for 2026–27. We'd love to help " +
  "you take the next step — would you like to visit the campus or ask us anything? " +
  "You're welcome any school day, 9:00 AM – 1:30 PM.";

function firstName(name: string): string {
  const n = name.trim().split(/\s+/)[0];
  return n && n !== "—" ? n : "there";
}

// wa.me link with the follow-up template pre-filled. Assumes +91 for bare
// 10-digit Indian numbers. Returns null if the phone has no digits.
export function followUpWaLink(phone: string, name: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.length === 10 ? `91${digits}` : digits;
  const text = FOLLOW_UP_TEMPLATE.replace("{first}", firstName(name));
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}
