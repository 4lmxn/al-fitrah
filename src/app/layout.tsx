import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { SITE_URL, getBrandName, schoolJsonLd, jsonLdHtml } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Analytics } from "@/components/Analytics";
import { ICON_NAMES } from "@/components/ui/Icon";

const sans = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const display = Baloo_2({ subsets: ["latin"], variable: "--font-baloo", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#faf7f0",
};

export async function generateMetadata(): Promise<Metadata> {
  const [{ school }, BRAND_NAME] = await Promise.all([getSettings(), getBrandName()]);
  const description = school.tagline;
  const homeTitle = `${BRAND_NAME} | Islamic Preschool in Bengaluru`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: homeTitle, template: `%s | ${BRAND_NAME}` },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

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
