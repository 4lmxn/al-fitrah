import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_URL, getBrandName, schoolJsonLd, jsonLdHtml } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Analytics } from "@/components/Analytics";
import { ICON_NAMES } from "@/components/ui/Icon";

const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-playfair", display: "swap" });



// Colours the mobile browser chrome to match the cream page background so the
// address bar doesn't sit as a jarring white/black strip above the site.
export const viewport: Viewport = {
  themeColor: "#faf7f0",
};

// Async because the brand and description come from configuration.
export async function generateMetadata(): Promise<Metadata> {
  const [{ school }, BRAND_NAME] = await Promise.all([getSettings(), getBrandName()]);
  const description = school.tagline;
  const homeTitle = `${BRAND_NAME} — Islamic Preschool in Bengaluru`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: homeTitle, template: `%s — ${BRAND_NAME}` },
    description,
    applicationName: BRAND_NAME,
    keywords: [
      "Islamic preschool Bengaluru",
      "preschool Sarjapura",
      "Pre-KG admissions",
      "Noor-ul-Bayan",
      "Qur'an for kids",
      "Oxford Early Learning",
      school.name,
    ],
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: BRAND_NAME, title: homeTitle, description, url: SITE_URL, locale: "en_IN" },
    twitter: { card: "summary_large_image", title: homeTitle, description },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = await schoolJsonLd();
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <head>
        {/* Warm the icon-font connection early: the stylesheet is render-blocking
            and its font file lives on a second origin (fonts.gstatic.com). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols is not in next/font's Google catalogue, so it must
            stay a plain <link>. display=block is deliberate: with swap the
            ligature name ("expand_more") flashes as literal text.

            icon_names subsets the font to the icons this site actually uses:
            316 KB for the whole set, 12 KB for ours, on a request that blocks
            first paint. Unknown names are ignored by Google, so the list can
            be over-inclusive; it must never be under-inclusive. */}
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${ICON_NAMES.join(",")}&display=block`}
        />
      </head>
      <body className="relative bg-cream text-ink font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
