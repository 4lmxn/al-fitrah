export type Cta = { label: string; href: string; variant: "primary" | "outline" };
export type NavItem = { label: string; href: string };
export type Site = {
  name: string;
  tagline: string;
  nav: NavItem[];
  contact: { phone: string; email: string; address: string };
};
export type Home = {
  hero: { eyebrow: string; title: string; subtitle: string; ctas: Cta[] };
  quickFacts: { label: string; value: string }[];
  whyUs: { title: string; body: string }[];
  programs: { ageGroup: string; title: string; description: string }[];
};
