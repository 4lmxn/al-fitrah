# Al Fitrah — Platform Architecture

Written against the School Management Platform brief (Aug 2026). Its purpose is
to record *why* the structure is what it is, so that adding ERP modules later is
an extension rather than a rewrite.

---

## 1. Honest position against the brief

Nothing here is a plan disguised as progress. Current state, module by module:

| Module | State | Gap |
|---|---|---|
| **Public website** | Mostly built | No Gallery; "Academics" is split across Programs/Syllabus |
| **CRM** | Core built | No assignment, tasks, tags, duplicate detection, bulk actions, export |
| **Admissions pipeline** | 6 stages, **hardcoded** | Brief wants 9 and *configurable* |
| **Teacher recruitment** | Applications + CV + pipeline | No portfolio links, interview scheduling, ratings, internal comments |
| **Attendance** | Student, daily, monthly % | No teacher attendance, bulk, CSV export, analytics |
| **Notifications** | Email + daily digest | No engine — channels are called directly |
| **Dashboards** | One (Insights) | Principal, Admissions, CRM, Attendance, HR, System |
| **Analytics** | Sources, funnel, referrers | No trends, campaign performance, monthly reports |

This is roughly a third of the brief. The remaining two thirds is months of
work, and saying otherwise would be dishonest.

## 2. The decision that has to come first

> *"NEVER hardcode mutable values. Everything configurable. Everything editable
> via Admin Panel."*

Ten constants currently live in TypeScript: `PIPELINES`, `STAGE_META`,
`CLASS_SECTIONS`, `PROGRAMS`, `LEAD_SOURCES`, `EMPLOYMENT_TYPES`, `POST_TYPES`,
`ATTENDANCE_STATUSES`, `STUDENT_STATUSES`, `PAYMENT_METHODS` — plus school
identity in `src/content/site.ts`.

Every module in the brief consumes at least one of them. **Building the eight
modules first and making configuration editable second means rewriting all
eight.** So configuration becomes data now, before the modules land on top of it.

### Why not "just read Firestore where needed"

Because the cost model forbids it. Config is read by nearly every request; a
naive read per request would add ~10 reads to every page and undo the work that
took the inbox from thousands of reads to ~33.

**Design:** one document per domain in `settings/`, wrapped in a request-and-
process cache keyed by a tag, invalidated on write. Steady state is *one*
Firestore read per revalidation window shared across every request, not per
request. Same shape as the ISR used for `/news` and `/careers`.

### Why defaults stay in code

`getSettings()` deep-merges the stored document over a typed default. Three
consequences, all deliberate:

1. **Nothing breaks before configuration exists.** The platform runs today with
   an empty `settings/` collection.
2. **A new setting ships with a working value** instead of needing a migration.
3. **A corrupt or partial document degrades to the default** rather than taking
   the site down — the settings doc is a single point of failure otherwise.

The stored document is the source of truth *where present*. Code is the floor.

## 3. Extension points for ERP

The brief asks that Student Profiles, Parent Portal, Marks, Timetable, Library,
Transport and the rest attach later without refactoring. Three seams carry that:

### 3.1 Configuration registry (`src/lib/settings`)

New modules declare their own section with a schema and defaults. No change to
existing settings code, no migration.

### 3.2 Notification engine (planned, not built)

Today `lib/email.ts` calls Resend directly from routes. That is the wrong shape
for the brief's "future channels should require no architectural changes".

Target: a `notify(event, payload)` dispatcher with channel adapters
(`email`, `dashboard`, `whatsapp`, `sms`) selected by configuration and by
templates stored in settings. Callers emit domain events — `lead.created`,
`interview.scheduled` — and never name a channel. Adding WhatsApp becomes one
adapter plus one config flag.

### 3.2b Two constants that deliberately stay in code

**School identity** now comes from configuration. Two consequences worth
recording: the address had to become structured, because a single string cannot
produce a JSON-LD `PostalAddress`; and `app/error.tsx` deliberately keeps a
hardcoded phone number, because it is the root error boundary and may well be
rendering *because* Firestore failed — a fallback that needs a working database
read is not a fallback.

**`COMING_SOON`** stays an environment variable. `proxy.ts` runs on every
request in a runtime that cannot read Firestore, so the gate itself must come
from env. Putting a copy in settings would create two sources of truth that can
disagree — exactly the bug fixed earlier by making the proxy, `robots.ts` and
`sitemap.ts` share one flag. The settings UI therefore shows it read-only.

### 3.3 Audit log (planned, not built)

The brief requires auditing every important action. Currently actions
`console.log` who did what, which is not queryable. Target: an append-only
`auditLog` collection written by the same batch as the mutation, keyed by
`(actor, entity, action, at)` — the same immutable-ledger discipline already
proven for fee payments.

## 4. Cost invariants these must respect

Non-negotiable, enforced by `tests/unit/costInvariants.test.ts`:

1. No unbounded collection reads — every query is bounded, counted, or a doc get.
2. Counts come from `count()` aggregations, never from fetching to count.
3. Public pages never read Firestore per request (static or ISR only).
4. Unbounded growth lives in subcollections, not documents.
5. No placeholder `null` in an indexed field.
6. Storage has a lifecycle rule.
7. **New:** configuration is cached, never read per request.

## 5. Sequence

Ordered by what unblocks the most downstream work:

1. ~~**Configuration as data**~~ — done (#32).
   1a. ~~**Pipelines read from configuration**~~ — done. `PIPELINES` and
       `STAGE_META` deleted; stages, labels, groups and terminal flags come from
       settings, and stage colour derives from group + position so a newly
       configured stage is styled automatically.
   1b. ~~**Admin UI for settings**~~ — done. `/admin/settings`, owner-only,
       covering school identity, both pipelines, lists, academic year,
       attendance rules and feature flags.
   1c. ~~**Taxonomy + attendance consumers**~~ — done. Programs, class sections,
       lead sources, employment types, payment methods and attendance statuses
       all read configuration. Compile-time `z.enum` checks became runtime
       membership checks: an enum could only accept the values that shipped, so
       a school adding a program would have had its own form rejected by its own
       server.
   1d. ~~**School identity**~~ — done. Name, branch, tagline, contact and a
       structured address come from configuration; every page's metadata moved
       from a `metadata` constant to `generateMetadata`.
   1e. **`COMING_SOON`** stays an env var, on purpose — see below.
2. **Audit log + notification engine** — the two seams every later module needs.
3. **CRM depth** — assignment, tasks, tags, duplicate detection, bulk actions, export.
4. **Configurable admissions pipeline** — the brief's 9 stages, driven by settings.
5. **Recruitment depth** — scheduling, ratings, internal comments.
6. **Attendance depth** — teacher attendance, bulk, export, analytics.
7. **Dashboards** — built last, because a dashboard over incomplete data teaches the wrong thing.

Dashboards last is deliberate. They are the most visible item and the least
useful to build early: a Principal Dashboard over a CRM with no task tracking
shows confident numbers about nothing.
