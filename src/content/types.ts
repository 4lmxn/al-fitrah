export type Cta = { label: string; href: string; variant: "primary" | "outline" | "gold" };
export type NavItem = { label: string; href: string };
export type Site = {
  name: string;
  tagline: string;
  ctaLabel: string;
  nav: NavItem[];
  contact: { phone: string; email: string; address: string };
};
export type Home = {
  hero: { eyebrow: string; title: string; subtitle: string; cta: Cta; image: string; imageAlt: string; badge: string };
  approach: { eyebrow: string; title: string; items: { icon: string; title: string; body: string }[] };
  highlights: { title: string; caption: string; image: string }[];
  seats: { title: string; subtitle: string; cta: Cta };
  contact: { title: string; subtitle: string; address: string; phone: string; email: string; image: string; imageAlt: string };
};
