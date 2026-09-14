# Al Fitrah — developer handover

Read this before touching the code. It is the context that is not derivable from
the files, ordered by how quickly it will save you.

---

## 1. What this is

A production website and admissions CRM for **Al Fitrah Pre School, Sarjapura** —
a franchise branch, which is why the brand is always qualified with the branch
name rather than just "Al Fitrah".

It is three products in one Next.js app:

| Surface | Route | Who uses it |
|---|---|---|
| Marketing site | `/`, `/programs`, `/admissions`, … | Parents researching schools |
| Admin console | `/admin/*` | School office — leads, students, fees, attendance, content |
| Parent portal | `/portal/*` | Enrolled families — fees and attendance, read-only |

It is live at **https://www.alfitrahsarjapura.in**, serving a real school with
real children's data. Treat it accordingly.

---

## 2. Stack, and why

- **Next.js 16** (App Router, React 19, Server Components + Server Actions)
- **Firestore** — the only datastore
- **Firebase Auth** — two separate identity flows (see §5)
- **Cloud Run** (`asia-south1`) behind a **Cloudflare Worker** — compute, deployed
  by hand; see §7. Firebase App Hosting (`asia-east1`) still exists and still
  builds, but no longer serves the domain
- **Tailwind v4**, no component library
- **Vitest** for unit tests, **Playwright** for e2e
- **Zod** for every trust boundary

There is no state manager, no ORM, no API layer. Pages are server components that
call functions in `src/lib/`, and those functions talk to Firestore. Mutations
are server actions. If you are reaching for a client-side fetch, stop and check
whether a server component would do it.

> ⚠️ `AGENTS.md` at the repo root warns that this Next version has breaking
> changes against older knowledge. Notably `middleware.ts` is now `proxy.ts`.
> When in doubt read `node_modules/next/dist/docs/`.

---

## 3. Running it

```bash
npm install
cp .env.example .env.local     # then fill in the values — see below
npm run dev                    # http://localhost:3000
```

Minimum to get a working local app:

| Variable | Why |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Server-side Firestore. Full service-account JSON on one line. |
| `NEXT_PUBLIC_FIREBASE_*` | Client SDK, used only for sign-in |
| `ADMIN_EMAILS` | Your own email, or you cannot reach `/admin` at all |

Checks, all of which must pass before you push:

```bash
npx tsc --noEmit          # types
npm run lint              # eslint, zero warnings tolerated
npm run test:unit         # 304 tests, ~2s
npm run build             # catches what the others miss
```

The test suite is fast and load-bearing. It has caught real mistakes — including
two of mine on the day this doc was written. Do not skip it because a change
"looks obviously safe".

---

## 4. The map

```
src/
  app/
    (site)/          marketing pages — mostly static, ISR
    admin/(dash)/    the console. Every page is force-dynamic + auth-gated
    portal/          parent-facing, separate auth
    api/             public intake endpoints (inquiry, application, capture) + cron
  lib/               ALL business logic and data access. Server-only.
  components/        ui/ (primitives), admin/, portal/, home/, pages/, layout/
  content/           marketing copy as typed data, not JSX
  proxy.ts           the coming-soon gate (Next 16's middleware)
cloudflare/          the edge Worker that fronts Cloud Run
scripts/             one-off migrations and repairs, all dry-run by default
docs/
  HANDOVER.md          this file — start here
  DESIGN_NOTES.md      why each file is the way it is, keyed by declaration
  ARCHITECTURE.md      how the modules fit, and what the ERP brief still wants
  IMPLEMENTATION_PLAN.md  what was hardened, and what is still open
  deploy-cloudrun-cloudflare.md  how production actually runs
  ops.md               runbook: backups, alerts, index deploys
```

**The rule that matters:** business logic lives in `src/lib/`, never in a page or
a component. `src/lib/` modules are `import "server-only"` and most of them call
`requireAdmin()` *inside the data function itself*, not just in the page that
renders it. A page is one caller; the data layer is the last place a mistake can
still be caught.

---

## 5. Three identities, and they are not interchangeable

This is the part people get wrong.

**Admin** (`src/lib/adminAuth.ts`, `src/lib/roles.ts`)
Firebase session cookie, but authorisation comes from the `ADMIN_EMAILS` env
allowlist — not from custom claims. Two roles: `owner` (can delete) and `staff`.
`ADMIN_OWNERS` is the owner subset; **blank means everyone is an owner**, which
is deliberate so introducing roles could not lock the school out.

**Parent** (`src/lib/parentAuth.ts`)
Firebase email-link sign-in, falling back to phone OTP. Email is the default
because SMS costs money per message and email is free under the MAU tier.

> The single most important invariant in this codebase: **which children a
> parent may see is resolved server-side from their verified credential, on
> every request.** Never from a URL, a form field, or the session cookie's
> contents. `assertOwnStudent()` gates every read of a specific child, and
> returns "not found" rather than "not allowed" so a parent probing ids cannot
> learn which exist. A parent seeing another family's fees or medical notes is
> the worst failure this system can have.

**Public**
No identity. `/api/inquiry`, `/api/application`, `/api/capture` are open, so they
are rate-limited, honeypotted, Zod-validated, and file-signature-checked.

---

## 6. Decisions that will bite you if you don't know them

### Money is integer paise, and the ledger is append-only
`src/lib/fees.ts`. `payments/{id}` rows are never updated or deleted.
`students/{id}.fees.paidPaise` is a **cache** maintained with
`FieldValue.increment()`, and `reconcile()` recomputes it from the ledger with a
`sum()` aggregation. A correction is a new **negative row**, never an edit.

Why: the obvious design (a mutable "amount paid" field) silently loses money when
two staff record payments simultaneously — both read 5000, both write 7000, one
parent's ₹2,000 vanishes with no error and no trace. It is the one bug class here
that cannot be reconstructed afterwards, because the evidence is what got
overwritten.

Never use floats for money. `0.1 + 0.2 !== 0.3`.

### Attendance is one document per class per day
`src/lib/attendance.ts`. Not one per student per day — that would be 20× the
writes and 20× the reads for a strictly worse query. The document id is
**derived** (`{year}_{section}_{date}`), which makes re-submitting a register
correct the day rather than duplicate it, and makes opening today's register a
single get with no query and no index.

Staff check-in (`src/lib/staffAttendance.ts`) uses the same shape for the same
reason, keyed by day.

### Settings are data, not constants
`src/lib/settings/`. Programs, class sections, pipeline stages, attendance
statuses, payment methods, notification templates, the campus pin — all stored in
`settings/platform` in Firestore, with the code defaults acting as a floor.

`mergeSettings()` deep-merges objects but **arrays replace**. A school that
configures five class sections means exactly five; merging into the shipped six
would resurrect a section they deliberately removed.

Read it via `getSettings()` (cached per revalidation window) or the helpers in
`src/lib/taxonomy.ts`. Never hardcode a program name or a stage id.

### Rate limits live in Firestore, and are coupled to instance count
`src/lib/rateLimit.ts`. They used to be in-process memory, which made every limit
N times looser at N instances — silently. That coupling is why `maxInstances` was
pinned at 1 for a long time. If you ever move the counters back to memory, you
must pin instances again.

### The audit log commits with the action it describes
`src/lib/audit.ts`. `queueAudit()` puts the entry on the **same batch** as the
write, so an audited action cannot succeed while its record quietly fails. A
best-effort audit is missing precisely when something went wrong. Append-only —
there is no update path and no delete path, by design.

### Server actions return, they do not throw
`src/lib/actionResult.ts`. A thrown error in production becomes an opaque digest
and blanks the page via the error boundary — an admin mid-triage loses the screen
and is told nothing. Expected failures ("that lead is gone", "that date doesn't
parse") are `fail("message")` and render next to the control that caused them.
Genuine bugs still throw.

### The icon font is subsetted
`src/components/ui/Icon.tsx` exports `ICON_NAMES`, and `layout.tsx` requests only
those glyphs from Google. Use an icon that is not in that list and it renders as
the literal word `location_off` in the middle of your layout.
`tests/unit/icons.test.ts` rescans the source and fails before a reviewer has to
spot it. Add the name when you add the icon.

### The campus geofence is advisory until someone turns it on
`src/lib/geofence.ts`. Staff check-in and the class register are both guarded by a
server-side distance check. It **ships with enforcement off** because the default
pin is approximate, and enforcing against a wrong pin locks every teacher out of
the register with no in-app way to fix it. See `docs/ops.md` §10 for the
activation sequence.

Be honest about what it does: it stops a teacher marking attendance from home. It
does not stop someone who mocks their location in devtools. Browser geolocation
is client-supplied and no server-side work changes that.

### `proxy.ts` is a gate, and its matcher is load-bearing
When `NEXT_PUBLIC_COMING_SOON=1`, every public route rewrites to `/coming-soon`.
Admin, portal and API stay reachable. Anything that must be fetchable by a
machine — `robots.txt`, `sitemap.xml`, the Search Console verification file — has
to be in the matcher's exclusion list or it gets served the holding page.

---

## 7. Deploying

**Production is Cloud Run in `asia-south1`, behind a Cloudflare Worker**, and it
does *not* deploy on push. Build the image and roll it out by hand — the full
sequence, and why it is not App Hosting, is in
`docs/deploy-cloudrun-cloudflare.md`. The Worker is in `cloudflare/`.

App Hosting still builds from `main` and its rollout check still goes green on
every commit. It is the older deployment and it is not what serves the domain;
do not read that check as "my change is live".

Firestore rules and indexes are **not** part of that deploy:

```bash
firebase deploy --only firestore:rules --project al-fitrah
firebase deploy --only firestore:indexes --project al-fitrah
```

Forgetting the rules deploy is the easy mistake — a new collection stays covered
by the catch-all deny, so nothing breaks visibly, but your explicit rule isn't
live.

**Secrets never go in `apphosting.yaml` as plain values** and never in a build
arg. `NEXT_PUBLIC_*` are inlined at build time; everything else is runtime-only.
`.env.example` documents the full contract.

---

## 8. Where things stand

**Live and working:** marketing site, admissions enquiries → CRM pipeline with
duplicate detection and assignment, staff applications with CV upload, student
records, fee ledger and collection worklist, class attendance, news/events CMS,
parent portal, audit log, notification engine, configurable settings.

**Just built, not yet activated:** campus geofence for attendance — enforcement
off pending the real campus pin.

**In progress:** online fee payment. The design is a provider-agnostic seam with
Razorpay as the first implementation; the gateway choice (Razorpay vs SBI ePay)
is still open pending a bank conversation. The rule for whoever builds it: the
**webhook is the only thing that credits money**, never the browser callback, and
the amount is computed server-side from the ledger balance, never taken from the
client.

**Known outstanding** (details in `docs/ops.md`): Firestore TTL policy on
`rateLimits`, Cloudflare in front of the origin, the named grievance officer the
DPDP Act requires, and `src/lib/storage.ts` being Firebase-specific if compute
ever moves.

---

## 9. House style

Read a neighbouring file before writing a new one. The conventions are
consistent and mostly visible.

- **The source carries no comments.** They were stripped from `src/` in
  Sep 2026, and the reasoning they held was moved to `docs/DESIGN_NOTES.md`,
  keyed by file and declaration. Several of those notes are cost or correctness
  arguments — read the note for a file before "simplifying" what it defends.
  Names and types are doing all the explaining in the code itself, so make them
  carry their weight.
- If you add a comment, it should be because a reader would otherwise call the
  code a bug: a workaround for someone else's defect, a deliberate ordering, a
  ceiling. Everything longer than that belongs in the design notes.
- A deliberate shortcut with a known ceiling is marked `ponytail:` with its
  upgrade path. Those are honest debt, not oversights.
- Non-trivial logic leaves a test behind. Money, auth, and validation always do.
- Prefer deleting to adding. This codebase has removed more than it has kept.
