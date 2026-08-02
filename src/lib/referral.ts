import { SITE_URL } from "@/lib/seo";

// Deterministic, human-ish referral code from a parent's name + phone — stable
// across visits with no extra storage. e.g. "ayesha-0718". The last 4 phone
// digits disambiguate common first names.
export function referralCode(name: string, phone: string): string {
  const first = (name.trim().split(/\s+/)[0] || "friend")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const last4 = phone.replace(/\D/g, "").slice(-4) || "0000";
  return `${first || "friend"}-${last4}`;
}

export function referralLink(code: string): string {
  return `${SITE_URL}/?ref=${encodeURIComponent(code)}`;
}

// Pre-filled WhatsApp share a parent can forward to friends.
export function referralShareLink(code: string): string {
  const text =
    `We're really happy with Al Fitrah Pre School in Sarjapura. ` +
    `If you're looking for a preschool, take a look: ${referralLink(code)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
