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

/**
 * Digits only, with a 91 country code added to bare 10-digit Indian numbers.
 *
 * A leading zero is dropped first. It is the domestic trunk prefix, not part of
 * the number, and people write it — "098765 43210" is eleven digits, which
 * without this would be stored verbatim. That is not a cosmetic difference:
 * guardian phone numbers are stored through this function and matched through
 * it again against the verified claim from Firebase (always +91…), so a number
 * saved with its trunk zero could never match, and that guardian could never
 * sign in to the portal. Nothing would report it — the lookup simply finds no
 * children and the parent is told the number is not on record.
 */
export function normalizeIndianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const local = digits.replace(/^0+/, "");
  if (!local) return null;
  return local.length === 10 ? `91${local}` : local;
}

/**
 * wa.me link for a number, optionally with pre-filled text.
 *
 * Returns null when there is nothing dialable — a lead with "—" for a phone
 * should render no button rather than a link to wa.me/ with no recipient.
 */
/**
 * E.164 for Firebase phone auth, or null when it is not an Indian mobile.
 *
 * Stricter than normalizeIndianPhone on purpose, and the difference is the
 * consequence. That one makes something dialable out of whatever the office
 * typed, and a wrong guess produces a wa.me link a human then looks at. This
 * one decides where a one-time code is SENT, and a wrong guess delivers a
 * sign-in code to a stranger's handset with nothing to look at.
 *
 * So it accepts only a ten-digit number starting 6-9 (every Indian mobile
 * does), after the trunk zero and country code are removed, and refuses
 * everything else rather than trimming it to fit.
 */
export function indianMobileE164(phone: string): string | null {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;
  const local = normalized.startsWith("91") ? normalized.slice(2) : normalized;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

export function waLink(phone: string, text?: string): string | null {
  const full = normalizeIndianPhone(phone);
  if (!full) return null;
  return text ? `https://wa.me/${full}?text=${encodeURIComponent(text)}` : `https://wa.me/${full}`;
}
