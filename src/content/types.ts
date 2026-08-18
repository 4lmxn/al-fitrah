export type Cta = { label: string; href: string; variant: "primary" | "outline" | "gold" };
export type NavItem = { label: string; href: string };
export type Site = {
  name: string;
  branch: string;
  tagline: string;
  ctaLabel: string;
  /** Top announcement bar. Split so one phrase can be picked out in gold. */
  announcement: { before: string; highlight: string; after: string };
  nav: NavItem[];
};
export type Home = {
  hero: {
    eyebrow: string;
    title: string;
    /** Words inside `title` to render in rainbow letters. */
    rainbow: string[];
    subtitle: string;
    cta: Cta;
    image: string;
    imageAlt: string;
    badge: string;
    /** Small facts that float over the hero photo. */
    chips: { icon: string; label: string }[];
  };
  /** Count-up strip. `value` animates from zero when scrolled into view. */
  stats: { value: number; suffix?: string; label: string }[];
  quickFacts: { icon: string; label: string; value: string }[];
  approach: { eyebrow: string; title: string; rainbow: string[]; subtitle: string; items: { icon: string; title: string; body: string }[] };
  highlights: { eyebrow: string; title: string; rainbow: string[]; subtitle: string; tiles: { title: string; caption: string; image: string }[] };
  welcome: { eyebrow: string; title: string; body: string[]; by: string; role: string };
  seats: { title: string; subtitle: string; cta: Cta };
  contact: { title: string; subtitle: string; address: string; phone: string; email: string; image: string; imageAlt: string };
};

// Shared page primitives
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

/**
 * One year of the programme. Parents choose by year — "what will my child do in
 * Pre-KG?" — not by subject, so the three levels are the spine of the page and
 * the subject breakdown is supporting detail.
 */
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
  /**
   * How we teach, not what we teach. The year-by-year section above already
   * covers content; repeating the subject list under a second heading was
   * saying the same thing twice.
   */
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

/**
 * Verifiable credibility, in place of testimonials. Every line here is a fact
 * that can be checked — an affiliation, a named curriculum, a published policy
 * — rather than a sentiment a competitor could copy in thirty seconds.
 */
export type TrustPage = {
  eyebrow: string;
  title: string;
  rainbow: string[];
  subtitle: string;
  items: { icon: string; title: string; body: string }[];
};
