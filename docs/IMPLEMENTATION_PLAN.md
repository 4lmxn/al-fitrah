# Al Fitrah — Production Hardening Plan

Derived from the architecture review of `main` @ `e426f4c` (Aug 2026).
Target: production CRM + public site, thousands of users, **Firebase spend under ₹1,000/month**.

*Status reconciled against `main` on 13 Sep 2026. The hardening plan below is
finished; §6 records what was built on top of it, because a plan that stops
describing the system is worse than no plan — it is a wrong map someone trusts.*

## Status

| Phase | State | Shipped in |
|---|---|---|
| 0 — Guardrails | ✅ done | #14 |
| 1a — Digest query bounds, careers caching | ✅ done | #15 |
| 1b — Notes subcollection | ✅ code merged, **backfill not yet run** | #16 |
| 1c/1d — Pagination + count() aggregations | ✅ done | #17 |
| 2a/2b — Roles, CV streaming | ✅ done | #18 |
| 2c/2d — Rate-limit coupling, CSP | ✅ done | #20 |
| 3a — DPDP compliance | ✅ done, **needs a named grievance officer** | #19 |
| 3b — Typed server-action errors | ✅ done | #21 |
| 4 — Students collection | ✅ foundation done | #22 |
| 3c — Small cleanups | ✅ resolved — see below | #17, #33, and obsolescence |
| 4b — Attendance, fees | ✅ done | #25, #26 |
| 5 — Website CMS (news & events) | ✅ done | #29 |

**Design change made during Phase 1:** the planned `stats/leads` aggregate
document was dropped in favour of Firestore `count()` aggregation queries, billed
one read per 1000 index entries. Same flat cost profile, minus the backfill,
minus counter write-amplification, minus a document that can silently drift from
the data it summarises.

**Phase 3c closed without its own PR**, which is why it sat marked "not started"
long after it was true. Each item was overtaken:

- *Dead `stage` branch in `listLeads`* — obsolete. `listLeads` no longer exists;
  the unbounded fetch it described was replaced by the paginated `getInbox` in
  #17, and `stage` is a real filter there now, not a dead parameter.
- *Thrice-duplicated `+91` normaliser* — done. `src/lib/phone.ts` is the single
  source, and its header records the three copies it replaced. A fourth copy was
  found in the parent sign-in component and removed in #48.
- *Two competing stage-label sources* — done by #33. Stages are configuration;
  `pipelines.stageLabelFor` reads the configured label and `stageMeta` derives
  presentation from the stage's group. Neither hardcodes a stage list, which is
  what made them able to disagree.

### Open items that need the school, not code

- **Notes backfill** — `node scripts/migrate-notes.mjs --commit`.
- **Named grievance officer** in `src/content/site.ts` (DPDP requirement).
- **No owner is named yet.** While neither `ADMIN_OWNERS` nor the staff roster
  names one, every allowed address resolves to `owner`, so the split does
  nothing and any signed-in account can delete. The permissive default was
  deliberate — it stopped the deploy that introduced roles from locking the
  school out — and it ends the moment the first owner exists. Since Sep 2026
  this no longer needs a deploy: **Staff → set a person to owner**, which is
  what `docs/SCHOOL_GUIDE.md` tells the school to do on day one.
- **`INQUIRY_FROM_EMAIL` is `onboarding@resend.dev`**, Resend's shared sandbox
  sender. Enquiry mail leaves from a domain the school does not own. Verify the
  school's domain in Resend before launch.
- **Cloudflare "Workers Builds" fails on every commit.** Not a code fault: the
  build integration runs from the repository root, where there is no Worker
  config, so `wrangler deploy` tries to onboard the Next.js app as a Worker and
  fails. From `cloudflare/` it builds clean. Fix is a dashboard setting — set the
  build root to `cloudflare`, or disconnect the integration, since
  `cloudflare/README.md` documents deploying the Worker by hand anyway.

---

## 1. The cost target, restated

₹1,000/month ≈ $12/month. That is not the real constraint — the Blaze **free tier** is:

| Resource | Free per day | Free per month |
|---|---|---|
| Firestore document reads | 50,000 | — |
| Firestore document writes | 20,000 | — |
| Firestore deletes | 20,000 | — |
| Firestore storage | — | 1 GiB |
| Cloud Storage | — | 5 GiB |
| Cloud Run requests (App Hosting) | — | 2M req, 180k vCPU-s, 360k GiB-s |
| Firebase Auth | — | 50k MAU |

**So the engineering goal is ₹0, not ₹1,000.** Staying inside the free tier leaves the
entire ₹1,000 as headroom for a bad month. Overage pricing (conservative, US
multi-region — regional asia-south1 is cheaper, so these are ceilings):

- reads `$0.06 / 100k` · writes `$0.18 / 100k` · storage `$0.18 / GiB / mo`

₹1,000 of overage would buy ~20M extra reads. We should never get near it.

### 1.1 Why today's design fails the target

Every admin page load calls `listLeads()`, which fetches **every lead of a type** with
no `limit`. Each lead document also carries its full `notes` array, so the payload
grows with note history too.

| Leads in DB | Reads per dashboard load | 200 loads/day |
|---|---|---|
| 200 | 200 | 40,000 (80% of free tier) |
| 2,000 | 2,000 | 400,000 (**8× over**) |
| 10,000 | 10,000 | 2,000,000 (**40× over**) |

At 10k leads that is ~$1.17/day ≈ **₹2,900/month** from the dashboard alone, before
the cron job's daily full scan. The target is missed by 3× and the curve is linear
with no ceiling.

### 1.2 Post-implementation budget (design targets)

| Surface | Reads / action | Actions / day | Reads / day |
|---|---|---|---|
| Public pages (static / prerendered) | 0 | 5,000 visits | **0** |
| `/careers` (ISR, 1h revalidate) | ~5 per revalidate | 24 | 120 |
| Admin inbox (25-row page + stats doc) | 26 | 200 | 5,200 |
| Lead detail (doc + first notes page) | 11 | 100 | 1,100 |
| Insights (reads stats doc only) | 1 | 96 | 96 |
| Cron follow-up digest (bounded query) | ~10 | 1 | 10 |
| **Total** | | | **≈ 6,500 / day** |

**13% of the free read tier.** Room for ~8× growth before a single rupee is billed.
Writes land near 100/day against a 20,000 allowance.

Crucially the curve becomes **flat in lead count** — 500 leads and 50,000 leads cost
the same per dashboard load, because pagination caps the page and counts come from a
pre-aggregated document.

### 1.3 Cost invariants (do not break these)

1. No unbounded `.get()` on a collection. Every query has `.limit()` or is a doc read.
2. Counts and KPIs come from an aggregate document, never from counting fetched docs.
3. Public pages never read Firestore per-request — static or ISR only.
4. Documents that grow without bound (notes, activity) live in subcollections.
5. Never write a field as `null` purely as a placeholder — an absent field is not indexed
   and cannot be swept into a range query.
6. Cloud Storage has a lifecycle rule so CVs cannot accumulate past the 5 GiB free tier.

Any PR violating one of these gets rejected regardless of what it improves.

---

## 2. Ground rules for every phase

- One phase = one PR = one reviewable unit. No mixing concerns.
- `npm run build && npm run lint && npm run test:unit` green before opening a PR.
- Behaviour-preserving unless the phase explicitly changes behaviour. Data migrations
  ship with a dry-run mode and are idempotent.
- Every phase adds or updates at least one test covering what it changed.
- No new runtime dependencies without an explicit call-out and sign-off.

---

## Phase 0 — Clear the decks + guardrails

Nothing else can start safely while 5 PRs sit open on the same files.

**0a. Land or close the open PRs** (#7, #9, #10, #11, #12). #7 and #9 both edit
`admin/(dash)/page.tsx` and `leads/[id]/actions.ts` and will conflict with each other
*and* with Phase 1. Suggested order: #12 → #11 → #10 → #9 → #7.

**0b. CI workflow** — build + lint + unit + e2e on every PR. Without this, every
subsequent phase is unverified at the point of review.

**0c. `firestore.indexes.json`** committed and wired into `firebase.json`, so indexes
are reviewable and reproducible instead of hand-clicked in the console.

**0d. Holding-page SEO leak** — while `NEXT_PUBLIC_COMING_SOON=1` (currently live in
`apphosting.yaml`), `proxy.ts` rewrites every public path to the holding page with
HTTP 200, and `sitemap.xml` still submits all 11 of them.

*Corrected after reading the code:* the holding page is indexable **on purpose**, with
`canonical: "/"`, so that the brand and location start ranking while the site is gated.
`noindex` would break that deliberate strategy. The actual leak is the sitemap handing
Google 11 URLs that all return the same page. Fix: gate `robots.ts` to `Allow: /$` and
narrow `sitemap.ts` to `/` while the flag is on. One shared `COMING_SOON` flag in
`lib/flags.ts` so the gate, the crawl rules, and the submitted URLs cannot disagree.

**0e. Local service-account key** — `.env.local` sets `GOOGLE_APPLICATION_CREDENTIALS`
to `serviceAccountKey.json`, so the file is *in active use* for local dev. Deleting it
outright breaks `npm run dev` immediately. Documented as a migration to
`gcloud auth application-default login` in `docs/ops.md` §5 instead, for the owner to
run. Not automated.

**0f. Ops (manual, documented in `docs/ops.md`)** — Firestore PITR, weekly export,
log-based alert on `severity=ERROR`, Storage lifecycle rule for CVs, index deploy,
budget alert.

> Exit criteria: `main` is the only branch, CI is green on it, indexes are in version
> control, the holding page cannot be indexed.

---

## Phase 1 — Cost-critical data model (the phase that hits the ₹0 target)

**1a. Stop writing `followUpDate: null`.** Firestore's cross-type value ordering places
Null before Timestamp, and an explicit `null` *is* indexed — so the cron's
`where("followUpDate", "<=", today)` sweeps every lead ever created. The in-memory
`.filter(l => l.followMs != null)` in the route is the fingerprint of exactly that.
Omit the field entirely, and add `.where("followUpDate", ">=", new Date(0))` as a
lower bound so the fix holds either way. Correct the route's "never scans the whole
collection" comment, which is currently false.

**1b. `notes` array → `leads/{id}/notes/{noteId}` subcollection** + a denormalised
`noteCount` maintained with `FieldValue.increment()`. Fixes three things at once: the
1 MiB document ceiling that would permanently brick an active lead (stage changes also
append to `notes`), the full-document rewrite on every note, and the inbox paying to
transfer note history it only uses for `.length`. Ships with an idempotent migration
script.

**1c. Aggregate stats document** (`stats/leads`) holding per-type and per-stage counts,
updated by the same writes that mutate a lead. Kills the "fetch everything to count it"
pattern in `getInbox` and `getInsights`.

**1d. Cursor pagination on the inbox** — `orderBy("createdAt","desc").limit(25)` with
`startAfter`, plus the `type + createdAt` composite index. Search moves to a prefix
query or stays client-side over the current page only (full-text search is out of scope
and would need a separate service).

**1e. Public `/careers` off per-request Firestore** — ISR with `revalidate: 3600`, and
`revalidatePath("/careers")` already fires from the admin actions, so edits stay instant.

> Exit criteria: dashboard read count is constant regardless of collection size, verified
> by seeding ~2,000 leads locally and counting reads.

---

## Phase 2 — Security hardening

**2a. RBAC** (`owner` / `staff`). *Shipped without custom claims — see `src/lib/roles.ts` and the note in DESIGN_NOTES for why a claim that outlives the decision was rejected.* Originally written as: Today
`ADMIN_EMAILS` is flat — the receptionist logging a phone call has identical rights to
the owner: every CV, every child's DOB, and delete on any record with no audit trail.
Claims are read from the already-decoded session cookie in `requireAdmin()`; no new
infrastructure.

**2b. Stream CVs through the route** instead of redirecting to a 15-minute signed URL
that lands in browser history and leaks via `Referer`. Also removes the untested
dependency on `iam.serviceAccounts.signBlob`, which ADC on App Hosting may not have
granted — as written this route can 500 in production and cannot be caught locally.

**2c. Firestore-backed rate limiting.** The in-memory `Map` is correct *only* because
`maxInstances: 1`, and nothing in either file records that coupling. Raising instances
for traffic would silently multiply every limit. Document the coupling immediately;
move limits to Firestore with a TTL policy before instances go up.

**2d. CSP baseline** beyond `frame-ancestors` — `default-src 'self'` with explicit
allowlists for `fonts.gstatic.com` and `googletagmanager.com`, nonce for inline JSON-LD.

---

## Phase 3 — Compliance + admin UX

**3a. DPDP Act 2023.** The site collects children's data (name, DOB, age band). The Act
requires verifiable parental consent, **prohibits behavioural tracking and targeted ads
directed at children** — GA4 currently loads on the same page as the child-data form
with no consent gate — and mandates a named grievance officer. Add: named officer,
explicit retention period, processors named (Google/Firebase, Resend), consent-gated
analytics.

**3b. Server actions return typed results** instead of `throw new Error(...)`. In
production Next.js replaces the throw with an opaque digest and the error boundary
blanks the page — an admin mid-triage clicks a stage dropdown and loses the screen with
no explanation. Render errors inline via `useActionState`.

**3c. Small cleanups** — delete the dead `stage` branch in `listLeads` (`getInbox` never
passes it), extract the thrice-duplicated `+91` phone normaliser into `lib/phone.ts`,
unify the two competing stage-label sources.

---

## Phase 4 — Students collection (CRM scope, Phase 2 of the product)

The stated CRM scope (students, parents, attendance, fees, communication, website CMS)
is ~15% built. Everything currently lives in one flat `leads` collection with a `type`
discriminator, and the two existing types already diverge (`name` vs `parentName`,
`role` vs `childAge`). Extending that pattern to students, fees, and attendance will not
hold.

Model `students` as its own collection with an admitted lead **converting** into one.
Design it against the same cost invariants: attendance is the highest-write surface in
any school CRM and must be modelled as per-day-per-class documents, never per-student
-per-day, or it alone will blow the write budget.

### 4a — Students foundation (done, #22)

`students` is its own collection, not a third `type` in `leads`. A lead does not
*become* a student — it *produces* one, and the lead survives as the record of
how the family arrived, which the funnel and referral reporting still count.
`leadId` keeps that link.

Admission numbers are allocated in a transaction. They are derived from the
highest already issued, so two staff enrolling at the same moment would
otherwise mint the same number — the exact identifier the school uses to tell
two children apart, and the field the roll paginates on.

### 4b — Attendance and fees (not started)

Both are higher-write than anything built so far, and attendance is the one that
can break the cost target on its own.

**Model attendance per class-day, not per student-day.** One document per class
per day holding a map of student → status is ~200 writes a month for a
six-class school. A document per student per day is ~6,000 for the same school,
and the daily register would read one document per child instead of one per
class. The naive shape is 30× the cost for a worse query.

**Fees** need an immutable ledger (`payments`) plus a derived balance, never a
mutable "amount paid" field — money that can be overwritten by a concurrent
write is the one place where losing a race is unrecoverable.

---

## 6. Built on top of this plan

The hardening plan ends at Phase 5. Everything below was built after it and is
in `main`; it is recorded here only so this document stops being a wrong map.
Each line is the shape of the thing, not its design — the reasoning lives in the
commit that shipped it.

**Configuration as data** (#32–#36). Pipelines, taxonomy, attendance statuses
and school identity are Firestore configuration with an admin UI, not constants.
A stage or a class section is added without a deploy. This is the seam every
later module plugs into, and the reason nothing above hardcodes a stage list.

**Platform services.** Append-only audit log (#37) with a two-year TTL; the
notification engine (#38), events in and channels out.

**CRM depth.** Duplicate detection and lead assignment (#39), CSV export and
bulk actions (#40), tags and recruitment fields (#41), and a pipeline board
beside the list.

**Parent identity and the portal** (#42, #43). Parents sign in by email link
where the school has an email, by phone code where it does not. Student ids are
re-resolved per request rather than stored in the cookie, so access ends when the
school says it does. Guardians can upload and download their child's documents;
the office sees the same files in a Documents tab.

**Students, deepened.** Tabbed profile with photographs, and an attendance
register rebuilt for the phone it is actually marked on.

**Fee structures** (#44). A price list, so a fee is defined once and applied to a
class. The amount is *copied* onto the child, not referenced, which keeps the
portal and the dues list at one read per child and stops a correction silently
restating what last year's families were charged.

**Resource centre** (#45). The school's files, where **the storage prefix is the
permission**: a public file lives under `content/` and is served by the bucket,
everything else under `resources/` and streamed through a session check.
Changing the audience moves the object. Where the bucket has no public read
endpoint — which is the case for the Mumbai files bucket — a public file takes
the closed path instead, rather than being recorded at a URL that 404s.

**Running outside App Hosting.** The app serves from Cloud Run in `asia-south1`
behind a Cloudflare Worker, because Cloud Run there cannot take a custom domain
and the alternatives cost several times the hosting budget. See
`docs/deploy-cloudrun-cloudflare.md`; the Worker lives in `cloudflare/`.

### Correctness fixes worth remembering

These were each found by something failing that looked unrelated, and each one
is a pattern to watch for rather than a one-off:

- **The server's clock is the school's clock.** Every "is it today" decision is
  made with `setHours(0, 0, 0, 0)`, which reads the *process* timezone. On a UTC
  container the day rolled over at 05:30 IST: a fee due today read as overdue,
  and the register opened on yesterday, for the first five and a half hours of
  every morning. Fixed by telling the runtime which timezone it is in (`TZ` plus
  `tzdata`, which alpine does not ship), not by teaching eleven call sites about
  timezones. Unit tests pin the same zone so a pass here and a pass in CI mean
  the same thing.
- **The audit log replaced `console.log`, eventually** (#47). Twenty call sites
  were still logging staff emails and record ids into Cloud Logging, where
  nothing can be queried and retention is whatever the default is. Both
  document-download routes had no audit entry at all. `tests/unit/noPiiLogs.test.ts`
  rescans the source so it cannot come back one action at a time.
- **A guardian whose number was stored with its trunk zero could never sign in**
  (#48). `normalizeIndianPhone` qualified only exactly-ten-digit numbers, and the
  same function is both what writes `guardianPhones` and what matches the
  verified `+91…` claim against it. The parent was told, correctly typed, that
  their number was not on record — and nothing logged it, because the lookup
  simply found no children. `scripts/fix-guardian-phones.mjs` repairs rows
  written before the fix.

## Deliberately out of scope

- Full-text lead search (needs Algolia/Typesense — a paid service, against the cost target)
- A rich-text editor for posts. The body is a plain textarea rendered as
  paragraphs, never as HTML — treating editor input as markup would make the CMS
  a stored-XSS surface. A sanitising editor is a real project, not a component swap.
- CMS for gallery, faculty and per-page SEO copy. Those change once or twice a
  year; news and events change weekly, which is where the developer dependency
  actually hurt. Same `posts` machinery extends to them when asked.
- Real-time listeners in the admin console (each open tab bills reads continuously)
- Charts in Insights (numbers are enough; a charting bundle is weight for no decision value)
- `npm audit fix --force` — downgrades `firebase-admin`. The 12 transitive advisories
  (`@google-cloud/storage` → `teeny-request`/`retry-request`/`uuid`) have no clean fix.
  Tracked, not chased.
