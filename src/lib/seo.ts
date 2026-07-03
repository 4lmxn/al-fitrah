// Central SEO / contact-channel constants. Single source of truth for the
// canonical site URL, social links, and the structured-data payload.
import type { Metadata } from "next";
import { site } from "@/content/site";

// Canonical production origin. Override per-environment with NEXT_PUBLIC_SITE_URL
// (no trailing slash). Falls back to the Firebase App Hosting default domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://al-fitrah.web.app"
).replace(/\/$/, "");

// Franchise-qualified brand for titles, social, and structured data. "Al Fitrah"
// operates as several branches; the ", Sarjapura" suffix lets Google distinguish
// this campus and own "Al Fitrah Sarjapura" searches and its Maps listing.
export const BRAND_NAME = `${site.name}, ${site.branch}`;

// Full street address used for the contact page, footer, and LocalBusiness schema.
export const FULL_ADDRESS = {
  street: "3rd Floor, Vivian Complex, Opp HP Petrol Bunk",
  locality: "Sompura Gate, Sarjapura",
  city: "Bengaluru",
  region: "Karnataka",
  postalCode: "562125",
  country: "IN",
} as const;

// Phone digits only (no "+" or spaces) for wa.me / tel: links.
const digits = (phone: string) => phone.replace(/[^\d]/g, "");

export const PHONE_E164 = `+${digits(site.contact.phone)}`;
export const WHATSAPP_URL = `https://wa.me/${digits(site.contact.phone)}`;

// Keyless Google Maps query + embed (no API key required).
const MAPS_QUERY = encodeURIComponent(
  `${FULL_ADDRESS.street}, ${FULL_ADDRESS.locality}, ${FULL_ADDRESS.city} ${FULL_ADDRESS.postalCode}`,
);
export const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;
export const MAPS_EMBED_URL = `https://maps.google.com/maps?q=${MAPS_QUERY}&z=16&output=embed`;

// Per-page metadata factory. Adds the self-referencing canonical (relative,
// resolved against metadataBase) and a per-page OpenGraph block so each route
// owns its URL/title instead of inheriting the generic root OG. `path` is the
// route's pathname with a leading slash (e.g. "/about").
export function pageMeta(
  path: string,
  { title, description }: { title: string; description: string },
): Metadata {
  const fullTitle = `${title} — ${BRAND_NAME}`;
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
    twitter: { card: "summary_large_image", title: fullTitle, description },
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

// JSON-LD structured data describing the school for rich results + Maps.
export function schoolJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Preschool",
    name: BRAND_NAME,
    description: site.tagline,
    url: SITE_URL,
    telephone: PHONE_E164,
    email: site.contact.email,
    image: `${SITE_URL}/opengraph-image`,
    hasMap: MAPS_DIRECTIONS_URL,
    ...(geoPoint ? { geo: geoPoint } : {}),
    // Local-intent signal: neighbourhoods this campus draws from.
    areaServed: ["Sarjapura", "Sompura", "Dommasandra", "Bengaluru"],
    // Al Fitrah operates as a franchise; this campus is the Sarjapura branch.
    parentOrganization: {
      "@type": "EducationalOrganization",
      name: site.name,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: `${FULL_ADDRESS.street}, ${FULL_ADDRESS.locality}`,
      addressLocality: FULL_ADDRESS.city,
      addressRegion: FULL_ADDRESS.region,
      postalCode: FULL_ADDRESS.postalCode,
      addressCountry: FULL_ADDRESS.country,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "13:30",
    },
  };
}