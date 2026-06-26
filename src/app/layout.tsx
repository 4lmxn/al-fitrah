import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import { SITE_URL, BRAND_NAME, schoolJsonLd } from "@/lib/seo";
import { Analytics } from "@/components/Analytics";

const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-playfair", display: "swap" });

const description =
  "Al Fitrah Pre School in Sarjapura, Bengaluru — a faith-centred 3-year program blending the Oxford Early Learning Curriculum with the Noor-ul-Bayan Qur'anic method.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${site.tagline}`,
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
    title: `${BRAND_NAME} — ${site.tagline}`,
    description,
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${site.tagline}`,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <head>
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
