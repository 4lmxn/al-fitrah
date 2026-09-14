import type { Metadata } from "next";
import { normalizeIndianPhone, waLink } from "@/lib/phone";
import { getSettings, addressLine, brandName } from "@/lib/settings";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://al-fitrah.web.app"
).replace(/\/$/, "");

export async function getBrandName(): Promise<string> {
  return brandName((await getSettings()).school);
}

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

const geoPoint = (() => {
  const lat = Number(process.env.NEXT_PUBLIC_GEO_LAT);
  const lng = Number(process.env.NEXT_PUBLIC_GEO_LNG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { "@type": "GeoCoordinates", latitude: lat, longitude: lng } as const;
})();

export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

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
    areaServed: ["Sarjapura", "Sompura", "Dommasandra", "Bengaluru"],
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