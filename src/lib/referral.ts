import { SITE_URL } from "@/lib/seo";

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

export function referralShareLink(code: string): string {
  const text =
    `We're really happy with Al Fitrah Pre School in Sarjapura. ` +
    `If you're looking for a preschool, take a look: ${referralLink(code)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
