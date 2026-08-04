/**
 * Phone normalisation and WhatsApp links.
 *
 * The "a bare 10-digit number is Indian, prefix 91" rule was written out three
 * times — the cron digest, the lead detail page, and the follow-up template —
 * each with its own copy of the conditional. Fixing a bug in one would have
 * left the other two wrong, and the failure is silent: a wrong prefix produces
 * a valid-looking wa.me link that opens a chat with the wrong person.
 *
 * Dependency-free so the public site's SEO module can share it too.
 */

/** Digits only, with a 91 country code added to bare 10-digit Indian numbers. */
export function normalizeIndianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * wa.me link for a number, optionally with pre-filled text.
 *
 * Returns null when there is nothing dialable — a lead with "—" for a phone
 * should render no button rather than a link to wa.me/ with no recipient.
 */
export function waLink(phone: string, text?: string): string | null {
  const full = normalizeIndianPhone(phone);
  if (!full) return null;
  return text ? `https://wa.me/${full}?text=${encodeURIComponent(text)}` : `https://wa.me/${full}`;
}
