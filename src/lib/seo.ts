// Central SEO / contact-channel constants. Single source of truth for the
// canonical site URL, social links, and the structured-data payload.
import type { Metadata } from "next";
import { normalizeIndianPhone, waLink } from "@/lib/phone";
import { getSettings, addressLine, brandName } from "@/lib/settings";

// Canonical production origin. Override per-environment with NEXT_PUBLIC_SITE_URL
// (no trailing slash). Falls back to the Firebase App Hosting default domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://al-fitrah.web.app"
).replace(/\/$/, "");




// wa.me enquiry link with a pre-filled message. `context` (usually the page
// path or a section name) is folded into the text so replies arrive tagged with
// where the parent was on the site when they reached out.


// Per-page metadata factory. Adds the self-referencing canonical (relative,
// resolved against metadataBase) and a per-page OpenGraph block so each route
// owns its URL/title instead of inheriting the generic root OG. `path` is the
// route's pathname with a leading slash (e.g. "/about").
/**
 * Per-page metadata. Async because the brand comes from configuration.
 *
 * Pages call this from `generateMetadata` rather than assigning to a
 * `metadata` const — a module-scope constant cannot await, which is what kept
 * school identity hardcoded.
 */
/** "Name, Branch" — used in titles, OpenGraph and structured data. */
export async function getBrandName(): Promise<string> {
  return brandName((await getSettings()).school);
}

/** Contact details and the links derived from them. */
export async function getContact() {
  const { school } = await getSettings();
  const digits = normalizeIndianPhone(school.phone) ?? "";
  const mapsQuery = encodeURIComponent(addressLine(school.address));
  return {
    phone: school.phone,
    phoneE164: `+${digits}`,
    email: school.email,
    address: school.address,
    addressLine: addressLine(school.address),
    whatsappUrl: `https://wa.me/${digits}`,
    mapsDirectionsUrl: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
    mapsEmbedUrl: `https://maps.google.com/maps?q=${mapsQuery}&z=16&output=embed`,
  };
}

/**
 * wa.me enquiry link with a pre-filled message. `context` (usually the page or
 * section) is folded into the text so replies arrive tagged with where the
 * parent was when they reached out.
 */
export async function waEnquiryLink(context?: string): Promise<string> {
  const { school } = await getSettings();
  const where = context ? ` (from ${context})` : "";
  const text = `Assalamu alaikum, I'd like to know more about admissions at ${brandName(school)}${where}.`;
  return waLink(school.phone, text) ?? `https://wa.me/${normalizeIndianPhone(school.phone) ?? ""}`;
}

export async function pageMeta(
  path: string,
  { title, description }: { title: string; description: string },
): Promise<Metadata> {
  const BRAND_NAME = await getBrandName();
  const fullTitle = `${title} | ${BRAND_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      title: fullTitle,
      description,
      url: `${SITE_URL}${path}`,
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}

// Exact campus pin for the LocalBusiness `geo` block — the strongest local-SEO
// / Google Maps signal. Sourced from env (not hard-coded) so we never ship a
// guessed coordinate; emitted only when BOTH values parse as finite numbers.
const geoPoint = (() => {
  const lat = Number(process.env.NEXT_PUBLIC_GEO_LAT);
  const lng = Number(process.env.NEXT_PUBLIC_GEO_LNG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { "@type": "GeoCoordinates", latitude: lat, longitude: lng } as const;
})();

// Serialise an object as a JSON-LD `<script>` inner HTML. Plain JSON.stringify
// leaves `<`, `>` and `&` raw, so a value containing `</script>` would break
// out of the tag — a stored-XSS sink if user-derived data ever lands in the
// graph. Escaping these to their \uXXXX forms keeps the JSON valid while making
// tag breakout impossible. U+2028/U+2029 are also escaped: valid in JSON but
// illegal raw in a JS string literal, so they'd break inline-script parsing.
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// JSON-LD structured data describing the school for rich results + Maps.
export async function schoolJsonLd() {
  const { school } = await getSettings();
  const contact = await getContact();
  return {
    "@context": "https://schema.org",
    "@type": ["Preschool", "LocalBusiness"],
    name: brandName(school),
    description: school.tagline,
    url: SITE_URL,
    telephone: contact.phoneE164,
    email: school.email,
    image: `${SITE_URL}/opengraph-image`,
    hasMap: contact.mapsDirectionsUrl,
    ...(geoPoint ? { geo: geoPoint } : {}),
    // Local-intent signal: neighbourhoods this campus draws from.
    areaServed: ["Sarjapura", "Sompura", "Dommasandra", "Bengaluru"],
    // Al Fitrah operates as a franchise; this campus is the Sarjapura branch.
    parentOrganization: {
      "@type": "EducationalOrganization",
      name: school.name,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: [school.address.street, school.address.locality].filter(Boolean).join(", "),
      addressLocality: school.address.city,
      addressRegion: school.address.region,
      postalCode: school.address.postalCode,
      addressCountry: school.address.country,
    },
    // openingHoursSpecification: hours schema omitted until school confirms working days.
  };
}