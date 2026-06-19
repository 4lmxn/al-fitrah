# Al Fitrah Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Firebase project skeleton with the "Sacred Growth" design system, a shared site shell (header/footer), and a fully built Home page, verified by a Playwright smoke test.

**Architecture:** Next.js App Router + TypeScript + Tailwind + Framer Motion. Content for Phase 1 lives in a typed static module (`src/content/`) so pages are built against a stable shape; Plan 3 swaps that module for Firestore reads without touching page components. Design tokens live in Tailwind theme + CSS variables. UI primitives are small, focused, reusable.

**Tech Stack:** Next.js (App Router), TypeScript, TailwindCSS, Framer Motion, Playwright (smoke).

## Global Constraints

- Package manager: `npm`. Node `v26`, npm `v11` (verified on dev machine).
- Palette ("Sacred Growth"): Emerald `#065f46`, gold accent `#c9a227`, cream `#faf7f0`, ink `#1c1917`. Exact hex, no improvised colors.
- Mobile-first, responsive. Semantic HTML (`header`/`nav`/`main`/`section`/`footer`).
- `const` by default; no `var`. Prefer Server Components; add `"use client"` only when interactivity/motion requires it.
- No real human faces in imagery (Islamic pre-school requirement).
- No secrets committed; only `.env.example`.
- Repo is the local `Al_Fitrah` git repo (branch `main`) — never commit to shared `/Projects/.git`.
- All copy in professional English.

---

### Task 1: Scaffold Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.env.example`
- Create: `playwright.config.ts`

**Interfaces:**
- Produces: a runnable Next.js app on `http://localhost:3000`; `npm run dev`, `npm run build`, `npm run test:e2e` scripts.

- [ ] **Step 1: Scaffold with create-next-app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --no-turbopack --use-npm --yes
```

- [ ] **Step 2: Add Framer Motion + Playwright**

```bash
npm install framer-motion
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Add scripts + env example**

Edit `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test:e2e": "playwright test"
  }
}
```

Create `.env.example`:

```
# Firebase (Phase 3+) — do NOT commit real values
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app (TS, Tailwind, Framer Motion, Playwright)"
```

---

### Task 2: Design tokens + typography

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx` (fonts + base body classes)

**Interfaces:**
- Produces: Tailwind theme colors `emerald`, `gold`, `cream`, `ink`; font CSS variables `--font-sans`, `--font-display`; usable utility classes `bg-cream text-ink`, `text-emerald`, `text-gold`.

- [ ] **Step 1: Define theme in `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        emerald: { DEFAULT: "#065f46", dark: "#044235", light: "#0a7a5a" },
        gold: { DEFAULT: "#c9a227", light: "#e3c97c", soft: "#f3e9c7" },
        cream: "#faf7f0",
        ink: "#1c1917",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Load fonts + base styles in `layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Al Fitrah Islamic Pre-School",
  description: "A nurturing Islamic pre-school where young hearts and minds grow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="bg-cream text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Add base layer in `globals.css`**

Replace generated content with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  h1, h2, h3 { @apply font-display tracking-tight text-ink; }
  :focus-visible { @apply outline outline-2 outline-offset-2 outline-emerald; }
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(design): Sacred Growth tokens + typography"
```

---

### Task 3: UI primitives

**Files:**
- Create: `src/components/ui/Container.tsx`
- Create: `src/components/ui/Section.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/lib/cn.ts`

**Interfaces:**
- Produces:
  - `cn(...classes: (string | false | null | undefined)[]): string`
  - `<Container className?>` — centered max-width wrapper
  - `<Section id? className? children>` — vertical-rhythm section wrapper
  - `<Button href? variant?("primary"|"outline") className? children>` — renders `<a>` when `href` given, else `<button>`

- [ ] **Step 1: Write `cn` helper**

```ts
// src/lib/cn.ts
export const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ");
```

- [ ] **Step 2: Write Container + Section**

```tsx
// src/components/ui/Container.tsx
import { cn } from "@/lib/cn";
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}
```

```tsx
// src/components/ui/Section.tsx
import { cn } from "@/lib/cn";
export function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return <section id={id} className={cn("py-20 sm:py-28", className)}>{children}</section>;
}
```

- [ ] **Step 3: Write Button**

```tsx
// src/components/ui/Button.tsx
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  href?: string;
  variant?: "primary" | "outline";
  className?: string;
  children: React.ReactNode;
};

const base = "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline";
const variants = {
  primary: "bg-emerald text-cream hover:bg-emerald-dark",
  outline: "border border-emerald/30 text-emerald hover:bg-emerald/5",
};

export function Button({ href, variant = "primary", className, children }: Props) {
  const cls = cn(base, variants[variant], className);
  return href ? <Link href={href} className={cls}>{children}</Link> : <button className={cls}>{children}</button>;
}
```

- [ ] **Step 4: Verify typecheck/build**

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): Container, Section, Button primitives + cn helper"
```

---

### Task 4: Content module (typed static content)

**Files:**
- Create: `src/content/types.ts`
- Create: `src/content/home.ts`
- Create: `src/content/site.ts`

**Interfaces:**
- Produces:
  - `site: { name: string; tagline: string; nav: { label: string; href: string }[]; contact: { phone: string; email: string; address: string } }`
  - `home: { hero: { eyebrow: string; title: string; subtitle: string; ctas: { label: string; href: string; variant: "primary" | "outline" }[] }; quickFacts: { label: string; value: string }[]; whyUs: { title: string; body: string }[]; programs: { ageGroup: string; title: string; description: string }[] }`

This module is the seam Plan 3 replaces with Firestore reads — page components import only from `@/content/*`.

- [ ] **Step 1: Define types**

```ts
// src/content/types.ts
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
```

- [ ] **Step 2: Write site content**

```ts
// src/content/site.ts
import type { Site } from "./types";
export const site: Site = {
  name: "Al Fitrah Islamic Pre-School",
  tagline: "Where young hearts and minds grow with faith.",
  nav: [
    { label: "About", href: "/about" },
    { label: "Programs", href: "/programs" },
    { label: "Admissions", href: "/admissions" },
    { label: "Campus Life", href: "/campus-life" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    phone: "+91 00000 00000",
    email: "hello@alfitrah.example",
    address: "Bangalore, India",
  },
};
```

- [ ] **Step 3: Write home content**

```ts
// src/content/home.ts
import type { Home } from "./types";
export const home: Home = {
  hero: {
    eyebrow: "Islamic Pre-School · Ages 2–6",
    title: "A nurturing place where faith and curiosity grow together.",
    subtitle:
      "Al Fitrah blends Montessori-inspired learning with Islamic values in a warm, modern environment.",
    ctas: [
      { label: "Apply for Admission", href: "/admissions", variant: "primary" },
      { label: "Explore Programs", href: "/programs", variant: "outline" },
    ],
  },
  quickFacts: [
    { label: "Ages", value: "2–6 yrs" },
    { label: "Class size", value: "≤ 12" },
    { label: "Approach", value: "Montessori" },
    { label: "Values", value: "Faith-first" },
  ],
  whyUs: [
    { title: "Faith-centered", body: "Daily Islamic values woven gently into play and routine." },
    { title: "Small classes", body: "Low ratios so every child is seen, heard, and nurtured." },
    { title: "Whole-child", body: "Cognitive, social, emotional, and spiritual growth together." },
  ],
  programs: [
    { ageGroup: "2–3 yrs", title: "Toddler", description: "Gentle first steps into structured play." },
    { ageGroup: "3–4 yrs", title: "Nursery", description: "Language, motor skills, and early Deen." },
    { ageGroup: "4–6 yrs", title: "Kindergarten", description: "Pre-literacy, numeracy, and Quran basics." },
  ],
};
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(content): typed static content seam (site + home)"
```

---

### Task 5: Site shell — Header + Footer

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx` (mount Header/Footer around `{children}`)

**Interfaces:**
- Consumes: `site` from `@/content/site`, `Container`, `Button`.
- Produces: `<Header />`, `<Footer />` rendered on every page.

- [ ] **Step 1: Write Header (client, mobile nav toggle)**

```tsx
// src/components/layout/Header.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-emerald/10 bg-cream/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-lg font-semibold text-emerald">
          {site.name}
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-ink/70 hover:text-emerald">
              {n.label}
            </Link>
          ))}
          <Button href="/admissions">Apply</Button>
        </nav>
        <button
          className="md:hidden text-emerald"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </Container>
      {open && (
        <nav className="md:hidden border-t border-emerald/10 bg-cream" aria-label="Mobile">
          <Container className="flex flex-col gap-3 py-4">
            {site.nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-ink/80" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <Button href="/admissions" className="mt-2">Apply</Button>
          </Container>
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Write Footer**

```tsx
// src/components/layout/Footer.tsx
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-emerald/10 bg-emerald text-cream">
      <Container className="grid gap-8 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg">{site.name}</p>
          <p className="mt-2 text-sm text-cream/70">{site.tagline}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-cream/70">
            {site.nav.map((n) => (
              <li key={n.href}><Link href={n.href} className="hover:text-cream">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="text-sm text-cream/70">
          <p className="font-semibold text-cream">Contact</p>
          <p className="mt-3">{site.contact.address}</p>
          <p>{site.contact.phone}</p>
          <p>{site.contact.email}</p>
        </div>
      </Container>
      <Container className="border-t border-cream/10 py-5 text-xs text-cream/50">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </Container>
    </footer>
  );
}
```

- [ ] **Step 3: Mount in `layout.tsx`**

Wrap children:

```tsx
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
// ...inside <body>:
<Header />
<main>{children}</main>
<Footer />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(layout): Header with mobile nav + Footer"
```

---

### Task 6: Home page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/home/Hero.tsx`
- Create: `src/components/home/QuickFacts.tsx`
- Create: `src/components/home/WhyUs.tsx`
- Create: `src/components/home/ProgramsPreview.tsx`
- Create: `src/components/home/AdmissionCTA.tsx`

**Interfaces:**
- Consumes: `home` from `@/content/home`, `Container`, `Section`, `Button`.
- Produces: Home page rendering hero (`<h1>`), quick facts, why-us, programs preview, admission CTA. Stable test hooks: `data-testid="hero"`, `data-testid="admission-cta"`.

- [ ] **Step 1: Write Hero (with motion)**

```tsx
// src/components/home/Hero.tsx
"use client";
import { motion } from "framer-motion";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function Hero() {
  const { hero } = home;
  return (
    <section data-testid="hero" className="bg-cream pt-16 pb-20 sm:pt-24">
      <Container className="max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold uppercase tracking-wide text-gold"
        >
          {hero.eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mt-4 text-4xl leading-tight sm:text-5xl"
        >
          {hero.title}
        </motion.h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink/70">{hero.subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {hero.ctas.map((c) => (
            <Button key={c.href} href={c.href} variant={c.variant}>{c.label}</Button>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Write QuickFacts, WhyUs, ProgramsPreview**

```tsx
// src/components/home/QuickFacts.tsx
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
export function QuickFacts() {
  return (
    <Container>
      <dl className="grid grid-cols-2 gap-4 rounded-xl2 border border-emerald/10 bg-white p-6 sm:grid-cols-4">
        {home.quickFacts.map((f) => (
          <div key={f.label} className="text-center">
            <dt className="text-xs uppercase tracking-wide text-ink/50">{f.label}</dt>
            <dd className="mt-1 font-display text-2xl text-emerald">{f.value}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}
```

```tsx
// src/components/home/WhyUs.tsx
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
export function WhyUs() {
  return (
    <Section>
      <Container>
        <h2 className="text-3xl">Why families choose Al Fitrah</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {home.whyUs.map((w) => (
            <div key={w.title} className="rounded-xl2 border border-emerald/10 bg-white p-6">
              <h3 className="text-xl text-emerald">{w.title}</h3>
              <p className="mt-2 text-ink/70">{w.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

```tsx
// src/components/home/ProgramsPreview.tsx
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
export function ProgramsPreview() {
  return (
    <Section className="bg-gold/5">
      <Container>
        <h2 className="text-3xl">Our programs</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {home.programs.map((p) => (
            <div key={p.title} className="rounded-xl2 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">{p.ageGroup}</p>
              <h3 className="mt-1 text-xl text-emerald">{p.title}</h3>
              <p className="mt-2 text-ink/70">{p.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-8"><Button href="/programs" variant="outline">See all programs</Button></div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 3: Write AdmissionCTA**

```tsx
// src/components/home/AdmissionCTA.tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
export function AdmissionCTA() {
  return (
    <Section>
      <Container>
        <div data-testid="admission-cta" className="rounded-xl2 bg-emerald px-8 py-14 text-center text-cream">
          <h2 className="text-3xl text-cream">Admissions are open</h2>
          <p className="mx-auto mt-3 max-w-md text-cream/80">
            Begin your child’s journey with us. Apply online in a few minutes.
          </p>
          <div className="mt-7 flex justify-center">
            <Button href="/admissions" className="bg-gold text-ink hover:bg-gold-light">Apply now</Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 4: Compose `page.tsx`**

```tsx
// src/app/page.tsx
import { Hero } from "@/components/home/Hero";
import { QuickFacts } from "@/components/home/QuickFacts";
import { WhyUs } from "@/components/home/WhyUs";
import { ProgramsPreview } from "@/components/home/ProgramsPreview";
import { AdmissionCTA } from "@/components/home/AdmissionCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickFacts />
      <WhyUs />
      <ProgramsPreview />
      <AdmissionCTA />
    </>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds, `/` is statically rendered.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(home): hero, quick facts, why-us, programs preview, admission CTA"
```

---

### Task 7: Playwright smoke test

**Files:**
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: running app via `playwright.config.ts` webServer; test hooks `data-testid="hero"`, `data-testid="admission-cta"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test("home renders hero, h1, CTAs, footer; no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("/");
  await expect(page.getByTestId("hero")).toBeVisible();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply for Admission" })).toBeVisible();
  await expect(page.getByTestId("admission-cta")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Al Fitrah");
  expect(errors).toEqual([]);
});

test("mobile nav toggles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
});
```

- [ ] **Step 2: Run to verify it fails (before pages exist) or passes (now)**

Run: `npm run test:e2e`
Expected: PASS (Home + shell already built in Tasks 5–6). If a selector mismatches, fix the component test hook, not the assertion.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(e2e): home smoke (hero, CTAs, footer, mobile nav, no console errors)"
```

---

## Self-Review

**Spec coverage (Foundation slice):** scaffold ✓ (T1), design system/tokens ✓ (T2–T3), component library ✓ (T3), content seam for future CMS ✓ (T4), shared shell ✓ (T5), Home page sections from sitemap ✓ (T6), smoke test ✓ (T7). Remaining spec sections (other pages, Firestore/CMS, leads/funnel, SEO depth, security rules) are covered by Plans 2–5.

**Placeholder scan:** No "TBD"/"implement later". `.env.example` keys are intentionally empty (no secrets).

**Type consistency:** `Cta.variant` (`"primary"|"outline"`) matches `Button` variant prop. `home`/`site` shapes match `types.ts`. Test hooks `hero`/`admission-cta` defined in T6, consumed in T7.

---

## Notes carried forward

- Stitch exports not yet received → Home uses the Sacred Growth system as the visual baseline. When exports arrive, refine spacing/imagery to match; structure stays.
- Firebase wiring (App Hosting, Firestore, Auth, Functions) begins in Plan 3; `.env.example` and Firebase deps are scaffolded but inert in Phase 1 Foundation.
