import type { Site } from "./types";
export const site: Site = {
  name: "Al Fitrah Pre School",
  branch: "Sarjapura",
  tagline: "Where young hearts and minds grow with faith.",
  ctaLabel: "Enroll Now",
  nav: [
    { label: "About", href: "/about" },
    { label: "Programs", href: "/programs" },
    { label: "Admissions", href: "/admissions" },
    { label: "Campus Life", href: "/campus-life" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    phone: "+91 99865 00718",
    email: "alfitrah.sompura@gmail.com",
    // Keep in sync with FULL_ADDRESS in src/lib/seo.ts (single source of address truth).
    address: "3rd Floor, Vivian Complex, Opp HP Petrol Bunk, Sompura Gate, Sarjapura, Bengaluru, Karnataka 562125",
  },
};
