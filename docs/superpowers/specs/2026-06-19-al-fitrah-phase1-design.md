# Al Fitrah — Phase 1 Design

**Date:** 2026-06-19
**Project:** Al Fitrah Islamic Pre-School — website + admissions lead capture + basic CMS
**Status:** Approved (design); pending implementation plan

---

## 1. Goal & Scope

Ship a launchable, SEO-first marketing website for Al Fitrah Islamic Pre-School with
working admissions lead capture and a staff-editable content layer (basic CMS).

**In scope (Phase 1):**
- Public marketing site (multi-page, SSR/ISR, SEO-first)
- Lead capture: quick inquiry forms + multi-step admission application
- Custom Firestore-backed admin dashboard for content editing (single admin role)
- Email notifications on new lead/application
- SEO foundation (metadata, structured data, sitemap, performance)

**Deferred to later waves (explicitly out of Phase 1):**
- CRM pipeline with 8 stages
- Visual drag-and-drop CMS, version rollback
- Role-based access control (5 roles), audit logs
- Analytics dashboard, heatmaps
- Student / parent / teacher portals, attendance, fees, LMS, mobile app
- News / Blog system

Rationale: the master brief bundles ~6 independent products. A pre-school launch needs the
public site + lead capture first; the rest is premature until real traffic exists (YAGNI).

---

## 2. Architecture

- **Frontend:** Next.js (App Router) + TypeScript + TailwindCSS + Framer Motion. SSR/ISR.
- **Backend:** Firebase
  - Firestore — content (CMS) + leads + applications
  - Auth — admin login, gated by an `admins/{uid}` allowlist (email/password)
  - Storage — image/document uploads
  - Cloud Functions — email notifications, validated writes for `leads`/`applications`
- **Hosting:** Firebase App Hosting (SSR support, single console).
- **Repo:** Own git repo at `Al_Fitrah/` (`main`), new private GitHub remote `al-fitrah`.
  Never committed to the shared `/Projects/.git`.

---

## 3. Sitemap (public)

Home · About · Academics/Programs · Admissions · Campus Life · Gallery · FAQ ·
Parent Resources · Contact.

(News/Blog deferred.)

---

## 4. Firestore Data Model

```
settings/global             // logo, contact info, social links, top banner, notices
siteContent/{pageId}        // CMS-editable page sections (hero, why-us, facilities, ...)
faculty/{id}                // name, role, photoUrl, bio, order
programs/{id}               // ageGroup, title, description, imageUrl, order
events/{id}                 // title, date, description, imageUrl
gallery/{id}                // imageUrl, category, caption
faqs/{id}                   // question, answer, category, order
testimonials/{id}           // author, relation, quote, order
leads/{id}                  // type(inquiry|callback|visit), name, phone, email, message,
                            //   stage:"new", createdAt
applications/{id}           // student, parent, academic, documents, status, ref, submittedAt
admins/{uid}                // allowlist doc gating dashboard access
```

---

## 5. CMS (custom dashboard at `/admin`)

- Firebase Auth login; access gated by presence of `admins/{uid}`.
- Field-based editors (not drag-and-drop):
  - Edit page text sections, swap images (Storage upload)
  - Manage faculty, programs, events, gallery, FAQs, testimonials
  - Edit global notices/banner and contact info
  - Edit per-page SEO metadata
- Publish writes to Firestore; public site reads via ISR with on-publish revalidation.
- **Single `admin` role in Phase 1.** Multi-role RBAC deferred.

---

## 6. Lead & Admission Flow

- **Quick forms:** general inquiry, callback request, schedule campus visit → `leads`.
- **Admission application:** 5 steps — student details → parent details → academic history
  → documents upload → review & submit.
  - Draft saved in localStorage + optional "email me a resume link" (no public accounts,
    avoiding parent-side auth complexity).
  - Submit → `applications` doc + admin email notification + parent confirmation email
    with a reference number.
  - Status viewable via emailed link / reference number.

---

## 7. SEO

SSR + dynamic per-page metadata, JSON-LD (`School` + `FAQPage` schema), `sitemap.xml`,
`robots.txt`, OpenGraph tags, canonical URLs, `next/image` optimization, lazy loading,
semantic HTML. Target: Lighthouse 90+, LCP < 2.5s, CLS < 0.1.

---

## 8. Security

- Firestore rules: public read on content collections; writes only via authed admin or
  Cloud Functions.
- `leads` and `applications`: written via validated Cloud Function (not direct client
  write); read admin-only.
- Input validation + sanitization on all form fields.
- Rate-limit form submission endpoints.
- Secure Storage rules for uploads (type/size limits, authed paths).
- Secrets in environment variables; only `.env.example` committed.

---

## 9. Design System

"Sacred Growth" palette: Emerald Green `#065f46` + gold accents + warm cream tones.
Premium, minimal, spacious, mobile-first. Design tokens, typographic scale, reusable
component library, consistent grid. Stitch exports (to be provided) drive visual fidelity
at build time. Illustration style: soft, respectful, no real human faces.

---

## 10. Build Waves (Phase 1)

1. Scaffold Next.js + design system (tokens, type scale, base components)
2. Public pages with static placeholder content
3. Firestore model + security rules + seed data
4. Admin CMS dashboard
5. Wire public pages to CMS content (ISR)
6. Lead forms + admission funnel + Cloud Functions / email
7. SEO pass + Lighthouse/QA hardening

---

## Open Items

- Stitch design exports/URLs to be provided by user (visual fidelity at build time).
- GitHub remote `al-fitrah` to be created when ready to push.
