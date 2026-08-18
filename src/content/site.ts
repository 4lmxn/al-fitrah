import type { Site } from "./types";
// Identity (name, contact, address, grievance officer) moved to configuration —
// see lib/settings. What remains is navigation and CTA copy, which are page
// structure rather than school details.
export const site: Site = {
  name: "Al Fitrah Pre School",
  branch: "Sarjapura",
  tagline: "Where young hearts and minds grow with faith.",
  ctaLabel: "Enroll Now",
  announcement: {
    before: "Admissions open for ",
    highlight: "2026-27",
    after: " · Limited seats · Ages 2y10m-3y10m · Sompura Gate, Sarjapura",
  },
  nav: [
    { label: "About", href: "/about" },
    { label: "Programs", href: "/programs" },
    { label: "Admissions", href: "/admissions" },
    { label: "Campus Life", href: "/campus-life" },
    { label: "News", href: "/news" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
};
