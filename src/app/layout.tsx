import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_URL, BRAND_NAME, schoolJsonLd } from "@/lib/seo";
import { Analytics } from "@/components/Analytics";

const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-playfair", display: "swap" });

const description =
  "Al Fitrah Pre School in Sarjapura, Bengaluru — a faith-centred 3-year program blending the Oxford Early Learning Curriculum with the Noor-ul-Bayan Qur'anic method.";

// Home title carries the money keywords ("Preschool", "Sarjapura",
// "Bengaluru") instead of the tagline, which truncated past ~60 chars.
const homeTitle = `${BRAND_NAME} — Islamic Preschool in Bengaluru`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: homeTitle,
    template: `%s — ${BRAND_NAME}`,
  },
  description,
  applicationName: BRAND_NAME,
  keywords: [
    "Islamic preschool Bengaluru",
    "preschool Sarjapura",
    "Pre-KG admissions",
    "Noor-ul-Bayan",
    "Qur'an for kids",
    "Oxford Early Learning",
    "Al Fitrah",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: homeTitle,
    description,
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Google Search Console site-ownership tag. Emits only when the token env is
  // set (undefined → Next omits the meta entirely), so nothing leaks in dev.
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <head>
        {/* Warm the icon-font connection early: the stylesheet is render-blocking
            and its font file lives on a second origin (fonts.gstatic.com). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols is not in next/font's Google catalogue, so it must
            stay a plain <link>. display=block is deliberate: with swap the
            ligature name ("expand_more") flashes as literal text. */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        />
      </head>
      <body className="relative bg-cream text-ink font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd()) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
