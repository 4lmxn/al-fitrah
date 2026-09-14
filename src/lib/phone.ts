export function normalizeIndianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const local = digits.replace(/^0+/, "");
  if (!local) return null;
  return local.length === 10 ? `91${local}` : local;
}

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
