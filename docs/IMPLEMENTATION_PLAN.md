# Al Fitrah — Production Hardening Plan

Derived from the architecture review of `main` @ `e426f4c` (Aug 2026).
Target: production CRM + public site, thousands of users, **Firebase spend under ₹1,000/month**.

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

**2a. RBAC via Firebase Auth custom claims** (`owner` / `admin` / `staff`). Today
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

> Not started until Phases 0–3 are merged.

---

## Deliberately out of scope

- Full-text lead search (needs Algolia/Typesense — a paid service, against the cost target)
- Real-time listeners in the admin console (each open tab bills reads continuously)
- Charts in Insights (numbers are enough; a charting bundle is weight for no decision value)
- `npm audit fix --force` — downgrades `firebase-admin`. The 12 transitive advisories
  (`@google-cloud/storage` → `teeny-request`/`retry-request`/`uuid`) have no clean fix.
  Tracked, not chased.
