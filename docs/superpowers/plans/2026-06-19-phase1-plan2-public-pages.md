# Al Fitrah Phase 1 — Plan 2: Stitch-Matched Public Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the design system to the Stitch designs and build all remaining public pages (rework Home + About, Programs, Admissions, Campus Life, FAQ, Parent Resources, Contact) to closely match the Stitch exports, fixing the nav 404s.

**Architecture:** Builds on Plan 1 Foundation (Next.js App Router, Tailwind v4 `@theme`, content seam in `src/content/*`, UI primitives, Header/Footer). Each page is a Server Component composing shared section components; only interactive pieces (FAQ accordion, mobile nav) are `"use client"`. Pages are ported faithfully from the Stitch source in `design/stitch/<page>.html` (markup/structure) + `design/stitch/<page>.png` (visual reference), re-expressed in our Tailwind v4 components — not copied verbatim (Stitch HTML uses a CDN Tailwind config + Material 3 token names we don't carry).

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind v4, Framer Motion, next/font (Inter + Playfair Display), Material Symbols Outlined (icons), Playwright.

## Global Constraints

- Package manager `npm`. Tailwind **v4** — tokens in `src/app/globals.css` `@theme`, NOT a JS config.
- Palette (from Stitch `tailwind.config`): brand emerald `#065f46`, darker emerald `#004532`, gold `#c9a227`, cream/background `#faf7f0`, ink `#1c1917`. Keep existing token names; add `--color-emerald-deep: #004532`.
- Fonts: body **Inter**, display **Playfair Display** (replaces Fraunces). Icons: **Material Symbols Outlined**.
- **Fidelity rule:** match each Stitch page's layout, section order, copy, and imagery closely. Source of truth per page: `design/stitch/<page>.html` + `design/stitch/<page>.png`. Re-express in our components; do not paste Stitch's raw HTML or its Material-3 class names.
- Images: use the downloaded assets in `design/stitch/assets/` and the 3 illustrations (`illus-classroom.png`, `illus-musalla.png`, `illus-circletime.png`). Copy chosen images into `public/images/` and render with `next/image`. No real human faces (illustrations only).
- Content stays behind the `src/content/*` seam (typed modules) so Plan 3 can swap to Firestore. Add one typed module per page.
- Mobile-first, semantic HTML (`header`/`nav`/`main`/`section`/`footer`), accessible (focus states, aria labels, `type="button"`, alt text).
- `const` not `var`; Server Components by default. Professional English copy.
- Repo: local `Al_Fitrah` git repo. Build base = the merged Plan 1 foundation (rebase/branch off it). Every task ends green (`npm run build`).

---

### Task 1: Design-system alignment (fonts + tokens + icons)

**Files:**
- Modify: `src/app/layout.tsx` (swap Fraunces→Playfair Display; add Material Symbols stylesheet)
- Modify: `src/app/globals.css` (add `--color-emerald-deep`, `--font-display` → Playfair var; Material Symbols base class)

**Interfaces:**
- Produces: `font-display` utility now renders Playfair Display; `text-emerald-deep`/`bg-emerald-deep` utilities; a `.material-symbols-outlined` icon class available globally.

- [ ] **Step 1: Swap display font in `layout.tsx`**

```tsx
import { Inter, Playfair_Display } from "next/font/google";
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-playfair", display: "swap" });
```
Update the `<html>` className to use `${sans.variable} ${display.variable}`. In `<head>` (via Next, add a `<link>` in the component using `next/document`-free approach — use a plain `<link>` in the body is invalid; instead add the Material Symbols stylesheet through `globals.css` `@import url(...)`).

- [ ] **Step 2: Update `@theme` + Material Symbols in `globals.css`**

```css
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap");
@import "tailwindcss";

@theme {
  --color-emerald: #065f46;
  --color-emerald-dark: #044235;
  --color-emerald-deep: #004532;
  --color-emerald-light: #0a7a5a;
  --color-gold: #c9a227;
  --color-gold-light: #e3c97c;
  --color-gold-soft: #f3e9c7;
  --color-cream: #faf7f0;
  --color-ink: #1c1917;
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-playfair), Georgia, serif;
  --radius-xl2: 1.25rem;
}

@layer base {
  h1, h2, h3 { @apply font-display tracking-tight text-ink; }
  :focus-visible { @apply outline outline-2 outline-offset-2 outline-emerald; }
  .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; line-height: 1; }
}
```

- [ ] **Step 3: Verify build + token generation**

Run: `npm run build`
Expected: success. Then `find .next -name "*.css" -path "*static*" -exec grep -l "Playfair\|emerald-deep\|004532" {} +` should match.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(design): align to Stitch — Playfair Display, emerald-deep, Material Symbols"
```

---

### Task 2: Icon + shared section primitives

**Files:**
- Create: `src/components/ui/Icon.tsx`
- Create: `src/components/ui/PageHero.tsx`
- Create: `src/components/ui/FeatureCard.tsx`
- Create: `src/components/ui/CTABand.tsx`
- Create: `src/components/ui/EyebrowPill.tsx`

**Interfaces:**
- Consumes: `Container`, `Section`, `Button`, `cn`.
- Produces:
  - `<Icon name: string className?>` — Material Symbols span (`aria-hidden`)
  - `<EyebrowPill icon?: string children>` — small rounded pill (gold-soft bg)
  - `<PageHero eyebrow?: string title: string subtitle?: string>` — centered page hero
  - `<FeatureCard icon: string title: string body: string>` — icon + title + body card
  - `<CTABand title: string subtitle?: string cta: { label: string; href: string }>` — emerald band with centered content

- [ ] **Step 1: Icon**

```tsx
// src/components/ui/Icon.tsx
import { cn } from "@/lib/cn";
export function Icon({ name, className }: { name: string; className?: string }) {
  return <span aria-hidden className={cn("material-symbols-outlined", className)}>{name}</span>;
}
```

- [ ] **Step 2: EyebrowPill + PageHero**

```tsx
// src/components/ui/EyebrowPill.tsx
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";
export function EyebrowPill({ icon, children, className }: { icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-deep", className)}>
      {icon && <Icon name={icon} className="text-base" />}
      {children}
    </span>
  );
}
```

```tsx
// src/components/ui/PageHero.tsx
import { Container } from "./Container";
import { Section } from "./Section";
import { EyebrowPill } from "./EyebrowPill";
export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <Section className="pb-10 pt-16 sm:pt-20">
      <Container className="max-w-3xl text-center">
        {eyebrow && <EyebrowPill className="mb-5">{eyebrow}</EyebrowPill>}
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-5 max-w-xl text-lg text-ink/70">{subtitle}</p>}
      </Container>
    </Section>
  );
}
```

- [ ] **Step 3: FeatureCard**

```tsx
// src/components/ui/FeatureCard.tsx
import { Icon } from "./Icon";
export function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-xl2 border border-emerald/10 bg-white p-7">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald/5 text-emerald">
        <Icon name={icon} />
      </span>
      <h3 className="mt-5 text-xl text-emerald">{title}</h3>
      <p className="mt-2 text-ink/70">{body}</p>
    </div>
  );
}
```

- [ ] **Step 4: CTABand**

```tsx
// src/components/ui/CTABand.tsx
import { Container } from "./Container";
import { Section } from "./Section";
import { Button } from "./Button";
export function CTABand({ title, subtitle, cta }: { title: string; subtitle?: string; cta: { label: string; href: string } }) {
  return (
    <Section>
      <Container>
        <div className="rounded-xl2 bg-emerald px-8 py-14 text-center text-cream">
          <h2 className="text-3xl text-cream">{title}</h2>
          {subtitle && <p className="mx-auto mt-3 max-w-md text-cream/80">{subtitle}</p>}
          <div className="mt-7 flex justify-center"><Button href={cta.href} variant="gold">{cta.label}</Button></div>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 5: Verify typecheck + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add -A && git commit -m "feat(ui): Icon, EyebrowPill, PageHero, FeatureCard, CTABand primitives"
```

---

### Task 3: Move Stitch imagery into public/ + nav/CTA copy alignment

**Files:**
- Create: `public/images/` (copy selected assets from `design/stitch/assets/` + the 3 illustrations)
- Modify: `src/content/site.ts` (nav labels + "Enroll Now" CTA copy + real-ish contact placeholders to match Stitch footer)
- Modify: `src/components/layout/Header.tsx` and `Footer.tsx` (CTA label "Enroll Now"; footer columns matching Stitch: Campus Locations / Program Highlights / Islamic Integration, Parent Portal / Careers / Privacy Policy — as static links for now)

**Interfaces:**
- Consumes: existing `site` shape.
- Produces: images under `public/images/<name>.png`; `site.nav` unchanged set, `site.ctaLabel = "Enroll Now"`.

- [ ] **Step 1: Copy images**

```bash
mkdir -p public/images
cp design/stitch/illus-classroom.png public/images/classroom.png
cp design/stitch/illus-musalla.png public/images/musalla.png
cp design/stitch/illus-circletime.png public/images/circle-time.png
cp design/stitch/assets/contact-0-3b6166da.png public/images/map.png
cp design/stitch/assets/campus-life-0-12a16d1b.png public/images/campus-engaged.png
cp design/stitch/assets/campus-life-1-256bfbcb.png public/images/campus-rhythm.png
cp design/stitch/assets/campus-life-2-1ced46dc.png public/images/campus-play.png
cp design/stitch/assets/campus-life-3-4fac4342.png public/images/campus-spaces.png
cp design/stitch/assets/campus-life-4-eb85bb66.png public/images/campus-creative.png
cp design/stitch/assets/campus-life-5-f4456ae4.png public/images/campus-community.png
```

- [ ] **Step 2: Add `ctaLabel` to site content + update Header/Footer**

In `src/content/site.ts` add `ctaLabel: "Enroll Now"` to the `Site` type and value. In `Header.tsx` replace the two `Apply` button labels with `{site.ctaLabel}`. In `Footer.tsx` replace the single nav column with three labelled columns using the Stitch footer link groups (static `href="#"` placeholders where no page exists — note these in the report). Keep the `<nav aria-label="Footer">` landmark.

- [ ] **Step 3: Verify build + commit**

Run: `npm run build` → success.
```bash
git add -A && git commit -m "feat(assets): public images + Enroll Now CTA + Stitch footer columns"
```

---

### Task 4: Rework Home to match Stitch

**Files:**
- Modify: `src/content/home.ts` + `src/content/types.ts` (reshape to Stitch sections)
- Rewrite: `src/components/home/Hero.tsx` (2-column: left copy+CTA, right image card)
- Create: `src/components/home/Approach.tsx` ("Our Unique Approach" — 3 FeatureCards)
- Create: `src/components/home/ContactPreview.tsx` ("Get in Touch" 2-col)
- Delete: `src/components/home/QuickFacts.tsx`, `WhyUs.tsx`, `ProgramsPreview.tsx` (replaced)
- Modify: `src/components/home/AdmissionCTA.tsx` → use shared `CTABand` ("Limited Seats Available!")
- Modify: `src/app/page.tsx` (compose Hero → Approach → CTABand → ContactPreview)

**Source of truth:** `design/stitch/home.html` + `design/stitch/home.png`.

**Interfaces:**
- Consumes: `home` content, `Container`, `Section`, `Button`, `FeatureCard`, `CTABand`, `EyebrowPill`, `Icon`, `next/image`.
- Produces: Home matching Stitch. Test hooks: `data-testid="hero"`, `data-testid="cta-band"`.

- [ ] **Step 1: Reshape `home.ts`/`types.ts`**

```ts
// types.ts — replace Home type
export type Home = {
  hero: { eyebrow: string; title: string; subtitle: string; cta: Cta; image: string; imageAlt: string };
  approach: { eyebrow: string; title: string; items: { icon: string; title: string; body: string }[] };
  seats: { title: string; subtitle: string; cta: Cta };
  contact: { title: string; subtitle: string; address: string; phone: string; email: string; image: string; imageAlt: string };
};
```

```ts
// home.ts — match Stitch copy
import type { Home } from "./types";
export const home: Home = {
  hero: {
    eyebrow: "Admissions Open for 2026–27",
    title: "A nurturing start rooted in faith and curiosity.",
    subtitle: "Al Fitrah blends Montessori-inspired learning with Islamic values in a warm, modern environment for ages 2–6.",
    cta: { label: "Begin Your Child's Path", href: "/admissions", variant: "primary" },
    image: "/images/classroom.png", imageAlt: "Children learning in a bright Al Fitrah classroom (illustration)",
  },
  approach: {
    eyebrow: "Our Unique Approach",
    title: "Building a strong foundation for your child's mind, character, and faith.",
    items: [
      { icon: "school", title: "Integrated Program", body: "A seamlessly connected curriculum that blends modern early-years learning with Islamic guidance." },
      { icon: "menu_book", title: "Quran & Tajweed", body: "Gentle, age-appropriate introduction to the Quran and correct recitation." },
      { icon: "favorite", title: "Character Building", body: "Nurturing good manners, empathy, and confidence through everyday practice." },
    ],
  },
  seats: { title: "Limited Seats Available!", subtitle: "Join the Al Fitrah family and give your child an education that balances modern excellence with timeless spiritual wisdom.", cta: { label: "Enroll Today", href: "/admissions", variant: "gold" } },
  contact: { title: "Get in Touch", subtitle: "We'd love to welcome your family for a visit.", address: "3rd Floor, Vivian Complex, Sarjapura, Bengaluru 562125", phone: "+91 99995 00718", email: "alfitrah.sompura@gmail.com", image: "/images/map.png", imageAlt: "Map showing Al Fitrah campus location" },
};
```

- [ ] **Step 2: Rewrite Hero (2-col)**

```tsx
// src/components/home/Hero.tsx
"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { EyebrowPill } from "@/components/ui/EyebrowPill";

export function Hero() {
  const { hero } = home;
  return (
    <Section data-testid="hero" className="pt-12 sm:pt-16">
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <EyebrowPill icon="calendar_month">{hero.eyebrow}</EyebrowPill>
          <h1 className="mt-5 text-4xl leading-tight sm:text-5xl">{hero.title}</h1>
          <p className="mt-5 max-w-md text-lg text-ink/70">{hero.subtitle}</p>
          <div className="mt-8"><Button href={hero.cta.href} variant={hero.cta.variant}>{hero.cta.label}</Button></div>
        </motion.div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl2 border border-emerald/10">
          <Image src={hero.image} alt={hero.imageAlt} fill className="object-cover" priority sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      </Container>
    </Section>
  );
}
```
Note: `Section` must forward `data-testid` — if it doesn't, add a `data-testid?: string` prop to `Section` in this step and pass through.

- [ ] **Step 3: Approach + ContactPreview**

```tsx
// src/components/home/Approach.tsx
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { FeatureCard } from "@/components/ui/FeatureCard";
export function Approach() {
  const { approach } = home;
  return (
    <Section className="bg-gold/5">
      <Container className="text-center">
        <h2 className="text-3xl">{approach.title}</h2>
        <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
          {approach.items.map((i) => <FeatureCard key={i.title} {...i} />)}
        </div>
      </Container>
    </Section>
  );
}
```

```tsx
// src/components/home/ContactPreview.tsx
import Image from "next/image";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
export function ContactPreview() {
  const { contact } = home;
  return (
    <Section>
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl">{contact.title}</h2>
          <p className="mt-3 text-ink/70">{contact.subtitle}</p>
          <ul className="mt-6 space-y-3 text-ink/80">
            <li className="flex gap-3"><Icon name="location_on" className="text-emerald" />{contact.address}</li>
            <li className="flex gap-3"><Icon name="call" className="text-emerald" />{contact.phone}</li>
            <li className="flex gap-3"><Icon name="mail" className="text-emerald" />{contact.email}</li>
          </ul>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl2 border border-emerald/10">
          <Image src={contact.image} alt={contact.imageAlt} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 4: AdmissionCTA → CTABand + compose page.tsx**

```tsx
// src/components/home/AdmissionCTA.tsx
import { home } from "@/content/home";
import { CTABand } from "@/components/ui/CTABand";
export function AdmissionCTA() {
  const { seats } = home;
  return <div data-testid="cta-band"><CTABand title={seats.title} subtitle={seats.subtitle} cta={seats.cta} /></div>;
}
```

```tsx
// src/app/page.tsx
import { Hero } from "@/components/home/Hero";
import { Approach } from "@/components/home/Approach";
import { AdmissionCTA } from "@/components/home/AdmissionCTA";
import { ContactPreview } from "@/components/home/ContactPreview";
export default function HomePage() {
  return (<><Hero /><Approach /><AdmissionCTA /><ContactPreview /></>);
}
```

- [ ] **Step 5: Update smoke test for new Home + verify**

Update `tests/e2e/home.spec.ts`: replace `getByTestId("admission-cta")` with `getByTestId("cta-band")`; keep hero/h1/footer/console-error/unexpected-404 assertions; the hero CTA link is now "Begin Your Child's Path" — assert that link visible.

Run: `npm run build && npm run test:e2e`
Expected: build success; 2/2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(home): rework to match Stitch (2-col hero, approach, seats band, contact)"
```

---

### Task 5: Content modules for remaining pages

**Files:**
- Create: `src/content/pages.ts` (typed content for about, programs, admissions, campusLife, faq, parentResources, contact)
- Modify: `src/content/types.ts` (add the page content types)

**Interfaces:**
- Produces: typed exports `about`, `programs`, `admissions`, `campusLife`, `faq`, `parentResources`, `contact`, each matching the section maps below. Keep the seam pattern (static now, Firestore in Plan 3).

- [ ] **Step 1: Define page content types + values**

Derive copy from each `design/stitch/<page>.html`/`.png`. Each module exports a typed object. Minimum shapes (extend as the page needs):

```ts
// types additions
export type FaqItem = { q: string; a: string };
export type FaqGroup = { category: string; icon: string; items: FaqItem[] };
export type ResourceCard = { icon: string; title: string; body: string; cta?: Cta };
export type Testimonial = { author: string; relation: string; quote: string };
export type Step = { title: string; body: string };
```

Author `src/content/pages.ts` with real copy lifted from the Stitch sources for:
- `about`: hero + story/vision/mission/leadership sections (port from about.html)
- `programs`: hero (eyebrow "3-Year Integrated Program", age 2–6, duration 3 years), curriculum bento (Arabic & Quran, Mathematics, English, Spiritual Education), outcomes quote + "View Full Syllabus" CTA
- `admissions`: hero "Secure Your Child's Place", 4 process `Step`s (Submit Inquiry, Campus Tour, Interaction, Enrollment), "Need Assistance?" contact, inquiry form field labels
- `campusLife`: hero, 6 bento image tiles (engaged/rhythm/play/spaces/creative/community), "The Daily Rhythm" 3 `FeatureCard`s
- `faq`: `FaqGroup[]` (Admissions Process, Islamic Integration, Fees & Scholarships, Daily Schedule) + "Still have questions?" CTA
- `parentResources`: hero, 5 `ResourceCard`s (Academic Calendar, Lunch Menu, Uniform Guidelines, Parent Handbook, Get Involved), 3 `Testimonial`s
- `contact`: hero "Get in Touch", contact details, map image, "Visit Us" hours (Mon–Fri 8:30–3:30, Sat 9:00–12:30)

- [ ] **Step 2: Verify typecheck + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add -A && git commit -m "feat(content): typed content for all remaining public pages"
```

---

### Task 6: About page (`/about`)

**Files:** Create `src/app/about/page.tsx`, `src/components/pages/about/*` as needed. **Source:** `design/stitch/about.html` + `about.png`.

**Interfaces:** Consumes `about` content, `PageHero`, `Section`, `Container`, shared cards, `next/image`. Produces route `/about` with `export const metadata` (title "About Us — Al Fitrah", description). Test hook: page `<h1>`.

- [ ] **Step 1:** Build `/about` porting the Stitch about layout (hero via `PageHero`, then vision/mission/story/leadership sections using `FeatureCard`/`Section`/`Container`). Use `public/images` where the design shows imagery.
- [ ] **Step 2:** Add `export const metadata` (School-appropriate title/description).
- [ ] **Step 3:** `npm run build` → `/about` renders, no 404 from nav.
- [ ] **Step 4:** Commit `feat(about): About page matched to Stitch`.

---

### Task 7: Programs page (`/programs`)

**Files:** Create `src/app/programs/page.tsx` (+ components). **Source:** `design/stitch/programs.html` + `programs.png`.

**Interfaces:** Consumes `programs` content, `PageHero`, `EyebrowPill`, `Icon`, `next/image` (use `/images/musalla.png` for the musalla block). Produces `/programs` + metadata. Test hook `<h1>`.

- [ ] **Step 1:** Hero with eyebrow "3-Year Integrated Program" + stat pills (age 2–6, duration 3 years).
- [ ] **Step 2:** "Comprehensive Curriculum" bento grid (Arabic & Quran large emerald card, Mathematics, English, Spiritual Education, classroom image).
- [ ] **Step 3:** Musalla image + "Program Outcomes" quote card with "View Full Syllabus" `Button`.
- [ ] **Step 4:** metadata; `npm run build` success.
- [ ] **Step 5:** Commit `feat(programs): Programs page matched to Stitch`.

---

### Task 8: Admissions page (`/admissions`)

**Files:** Create `src/app/admissions/page.tsx`, `src/components/pages/admissions/InquiryForm.tsx` (`"use client"`, UI only — no submit wiring; Plan 4 connects it). **Source:** `design/stitch/admissions.html` + `admissions.png`.

**Interfaces:** Consumes `admissions` content, `PageHero`. Produces `/admissions` + metadata. The form is presentational now: fields Parent Name, Phone, Email, Child's Age (select), Message, Submit button (disabled or no-op with a note). Test hooks: `<h1>`, `data-testid="inquiry-form"`.

- [ ] **Step 1:** Hero "Secure Your Child's Place".
- [ ] **Step 2:** 2-col: left = "Admissions Process" 4 `Step`s (numbered) + "Need Assistance?" emerald contact card; right = "Admissions Inquiry Form" card with the fields above.
- [ ] **Step 3:** Mark the form non-functional clearly in code comment (Plan 4 wires it); button `type="button"` no-op for now.
- [ ] **Step 4:** metadata; `npm run build` success.
- [ ] **Step 5:** Commit `feat(admissions): Admissions page + inquiry form UI (unwired)`.

---

### Task 9: Campus Life page (`/campus-life`)

**Files:** Create `src/app/campus-life/page.tsx` (+ components). **Source:** `design/stitch/campus-life.html` + `campus-life.png`.

**Interfaces:** Consumes `campusLife` content, `PageHero`, `FeatureCard`, `next/image` (campus-* images). Produces `/campus-life` + metadata. Test hook `<h1>`.

- [ ] **Step 1:** Hero "Campus Life".
- [ ] **Step 2:** Bento image grid (6 tiles with caption overlays: Engaged Minds large, Serene Rhythm, Joyful Play, Nurturing Spaces, Creative Expression, Community) using `next/image`.
- [ ] **Step 3:** "The Daily Rhythm" 3 `FeatureCard`s (Morning Arrival & Circle, Focused Work & Hifz, Outdoor Play & Dismissal).
- [ ] **Step 4:** metadata; `npm run build` success.
- [ ] **Step 5:** Commit `feat(campus-life): Campus Life page matched to Stitch`.

---

### Task 10: FAQ page (`/faq`)

**Files:** Create `src/app/faq/page.tsx`, `src/components/pages/faq/Accordion.tsx` (`"use client"`). **Source:** `design/stitch/faq.html` + `faq.png`.

**Interfaces:** Consumes `faq` content (`FaqGroup[]`), `PageHero`, `CTABand`, `Icon`. Produces `/faq` + metadata + `FAQPage` JSON-LD script. Test hooks: `<h1>`, first accordion toggles open.

- [ ] **Step 1:** Hero + (optional) left category nav listing group names.
- [ ] **Step 2:** Accordion groups: each `FaqGroup` heading (with icon) + accessible disclosure items (`<button aria-expanded>` controlling answer panel). Keyboard accessible.
- [ ] **Step 3:** "Still have questions?" `CTABand` (cta → /contact).
- [ ] **Step 4:** Add `FAQPage` JSON-LD (`<script type="application/ld+json">`) built from `faq` items. metadata.
- [ ] **Step 5:** `npm run build` success.
- [ ] **Step 6:** Commit `feat(faq): FAQ accordion page + FAQ schema`.

---

### Task 11: Parent Resources page (`/parent-resources`)

**Files:** Create `src/app/parent-resources/page.tsx` (+ components). **Source:** `design/stitch/parent-resources.html` + `parent-resources.png`.

**Interfaces:** Consumes `parentResources` content, `PageHero`, `FeatureCard`/`ResourceCard`. Produces `/parent-resources` + metadata. Test hook `<h1>`.

- [ ] **Step 1:** Hero "Parent Resources" (eyebrow "Family Gateway").
- [ ] **Step 2:** Resource cards grid (Academic Calendar, Lunch Menu, Uniform Guidelines, Parent Handbook, Get Involved) with `View`/`Download` links (placeholder `#`).
- [ ] **Step 3:** "Voices from our Community" 3 testimonial cards.
- [ ] **Step 4:** metadata; `npm run build` success.
- [ ] **Step 5:** Commit `feat(parent-resources): Parent Resources page matched to Stitch`.

---

### Task 12: Contact page (`/contact`)

**Files:** Create `src/app/contact/page.tsx` (+ components). **Source:** `design/stitch/contact.html` + `contact.png`.

**Interfaces:** Consumes `contact` content, `PageHero`, `Icon`, `next/image` (`/images/map.png`). Produces `/contact` + metadata. Test hook `<h1>`.

- [ ] **Step 1:** Hero "Get in Touch".
- [ ] **Step 2:** 2-col: Contact Details (address/phone/email with icons) + map image.
- [ ] **Step 3:** "Visit Us" emerald hours band (Mon–Fri 8:30 AM–3:30 PM, Sat 9:00 AM–12:30 PM; closed Sun & public holidays).
- [ ] **Step 4:** metadata; `npm run build` success.
- [ ] **Step 5:** Commit `feat(contact): Contact page matched to Stitch`.

---

### Task 13: Nav verification + multi-page smoke test

**Files:** Create `tests/e2e/pages.spec.ts`.

**Interfaces:** Consumes all routes built above.

- [ ] **Step 1: Write the test**

```ts
// tests/e2e/pages.spec.ts
import { test, expect } from "@playwright/test";

const routes = ["/about", "/programs", "/admissions", "/campus-life", "/faq", "/parent-resources", "/contact"];

for (const path of routes) {
  test(`${path} renders with h1 and no console errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("Failed to load resource")) consoleErrors.push(m.text());
    });
    const unexpected404s: string[] = [];
    page.on("response", (r) => { if (r.status() === 404 && !r.url().includes("_rsc=")) unexpected404s.push(r.url()); });

    const resp = await page.goto(path);
    expect(resp?.status()).toBeLessThan(400);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("footer")).toContainText("Al Fitrah");
    expect(consoleErrors).toEqual([]);
    expect(unexpected404s).toEqual([]);
  });
}

test("header nav navigates to a built page (no 404)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Programs" }).click();
  await expect(page).toHaveURL(/\/programs$/);
  await expect(page.locator("h1")).toBeVisible();
});
```

- [ ] **Step 2: Run**

Run: `npm run test:e2e`
Expected: all page tests + nav test pass (and the earlier home.spec). If any page route returns 404, that page task is incomplete — fix before proceeding.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test(e2e): all public pages render + nav has no 404s"
```

---

## Self-Review

**Spec coverage:** design-system alignment to Stitch (T1–T2), imagery + nav/CTA copy (T3), Home rework (T4), all 7 remaining pages from the sitemap (T6–T12), content seam preserved (T4–T5), FAQ schema (T10), nav 404 fix verified (T13). SEO metadata per page (T6–T12). Lead-form wiring and full SEO/Lighthouse pass remain Plans 3–5 (out of scope here).

**Placeholder scan:** No "TBD". Page tasks (T6–T12) intentionally reference the concrete Stitch source files (`design/stitch/<page>.html` + `.png`) as the per-page spec plus an explicit section list — this is faithful image-to-code, not a vague directive. Footer/resource links use `#` placeholders where target pages/files don't exist yet; flagged for report.

**Type consistency:** `Cta` reused from Plan 1 (`primary|outline|gold`). `Section` must forward `data-testid` (T4 Step 2 adds the prop if missing). New content types (`FaqGroup`, `ResourceCard`, `Testimonial`, `Step`) defined in T5 before consumption in T6–T12. Home test hook renamed `admission-cta`→`cta-band` consistently (T4 component + T4 test update).

**Scope check:** 13 tasks, one coherent deliverable (public marketing pages). Larger than Plan 1 but each task is an independently testable page/unit. Acceptable for subagent-driven execution.

---

## Notes carried forward
- Inquiry form (T8) is UI-only; Plan 4 wires it to a validated Cloud Function + Firestore `leads`.
- Footer/resource `#` links resolve when their targets exist (later plans / external docs).
- About/Programs/etc. exact copy is lifted from Stitch sources during implementation; subagents must read the page's `.html` for wording.
