export type Cta = { label: string; href: string; variant: "primary" | "outline" | "gold" };
export type NavItem = { label: string; href: string };
export type Site = {
  name: string;
  branch: string;
  tagline: string;
  ctaLabel: string;
  announcement: { before: string; highlight: string; after: string };
  nav: NavItem[];
};
export type Home = {
  hero: {
    eyebrow: string;
    title: string;
    rainbow: string[];
    subtitle: string;
    cta: Cta;
    image: string;
    imageAlt: string;
    badge: string;
    chips: { icon: string; label: string }[];
  };
  stats: { value: number; suffix?: string; label: string }[];
  quickFacts: { icon: string; label: string; value: string }[];
  approach: { eyebrow: string; title: string; rainbow: string[]; subtitle: string; items: { icon: string; title: string; body: string }[] };
  highlights: { eyebrow: string; title: string; rainbow: string[]; subtitle: string; tiles: { title: string; caption: string; image: string }[] };
  welcome: { eyebrow: string; title: string; body: string[]; by: string; role: string };
  seats: { title: string; subtitle: string; cta: Cta };
  contact: { title: string; subtitle: string; address: string; phone: string; email: string; image: string; imageAlt: string };
};

export type Feature = { icon: string; title: string; body: string };
export type Step = { icon: string; title: string; body: string };
export type FaqItem = { q: string; a: string };
export type FaqGroup = { id: string; icon: string; category: string; items: FaqItem[] };
export type ImageTile = { title: string; caption?: string; image: string };

export type AboutPage = {
  hero: { eyebrow: string; title: string; subtitle: string };
  mission: { title: string; body: string };
  vision: { title: string; body: string };
  team: { title: string; subtitle: string; image: string; imageAlt: string; points: Feature[] };
  location: { eyebrow: string; title: string; lines: string[]; image: string; imageAlt: string };
};

export type ProgramLevel = {
  badge: string;
  name: string;
  stage: string;
  summary: string;
  quran: string;
  academics: string;
  character: string;
};

export type ProgramsPage = {
  hero: { eyebrow: string; title: string; subtitle: string; stats: { icon: string; label: string; value: string }[] };
  levels: { title: string; rainbow: string[]; subtitle: string; items: ProgramLevel[] };
  method: {
    title: string;
    rainbow: string[];
    subtitle: string;
    items: { icon: string; title: string; body: string }[];
    tags: string[];
    image: string;
    imageAlt: string;
    imageCaption: string;
  };
  outcomes: { eyebrow: string; title: string; statement: string; body: string; cta: Cta };
  quranMethod: {
    eyebrow: string;
    title: string;
    rainbow: string[];
    subtitle: string;
    images: { src: string; alt: string; caption: string }[];
  };
};

export type AdmissionsPage = {
  hero: { eyebrow: string; title: string; subtitle: string };
  process: { title: string; steps: Step[] };
  assist: { title: string; phones: string[]; email: string };
  form: { title: string; subtitle: string; note: string };
};

export type CampusPage = {
  hero: { eyebrow: string; title: string; subtitle: string };
  gallery: ImageTile[];
  rhythm: { title: string; subtitle: string; items: Feature[] };
};

export type FaqPage = {
  hero: { eyebrow: string; title: string; subtitle: string };
  groups: FaqGroup[];
  cta: { title: string; body: string; cta: Cta };
};

export type ParentPage = {
  hero: { eyebrow: string; title: string; subtitle: string };
  resources: { icon: string; title: string; body: string; action: string; large?: boolean }[];
  academicCalendar: {
    title: string;
    subtitle: string;
    note: string;
    groups: { icon: string; title: string; items: string[] }[];
  };
};

export type ContactPage = {
  hero: { eyebrow: string; title: string; subtitle: string };
  details: { address: string[]; phones: string[]; email: string };
  image: string;
  imageAlt: string;
  hours: { title: string; rows: { label: string; value: string }[]; note: string };
};

export type TrustPage = {
  eyebrow: string;
  title: string;
  rainbow: string[];
  subtitle: string;
  items: { icon: string; title: string; body: string }[];
};
