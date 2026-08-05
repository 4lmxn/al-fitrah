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
    { label: "News", href: "/news" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    phone: "+91 99865 00718",
    email: "alfitrah.sompura@gmail.com",
    // Keep in sync with FULL_ADDRESS in src/lib/seo.ts (single source of address truth).
    address: "3rd Floor, Vivian Complex, Opp HP Petrol Bunk, Sompura Gate, Sarjapura, Bengaluru, Karnataka 562125",
  },
  // ⚠️ NEEDS A REAL NAME BEFORE LAUNCH.
  // India's DPDP Act 2023 requires a named, contactable person for data
  // grievances — the school collects children's names, dates of birth and age
  // bands, which the Act treats as a special category. Until `name` is filled
  // in, the privacy page falls back to naming the school itself, which is
  // weaker than the Act asks for. Ask the school who owns this and put them
  // here; no code change needed beyond this line.
  grievanceOfficer: {
    name: "",
    email: "alfitrah.sompura@gmail.com",
  },
};
