# Al Fitrah — Platform Architecture

Written against the School Management Platform brief (Aug 2026). Its purpose is
to record *why* the structure is what it is, so that adding ERP modules later is
an extension rather than a rewrite.

---

## 1. Honest position against the brief

Nothing here is a plan disguised as progress. Current state, module by module,
re-verified against the code on 16 Sep 2026:

| Module | State | Gap |
|---|---|---|
| **Public website** | Mostly built | No Gallery page; "Academics" is split across Programs/Syllabus |
| **CRM** | Built | No tasks. Duplicate detection, bulk stage moves and CSV export shipped. Assignment, tags and the Kanban board were built, then **removed in Sep 2026** — see below |
| **Admissions pipeline** | **Configurable** — stages are data, edited in Settings | None. The brief's nine stages are a configuration choice now, not a code change |
| **Teacher recruitment** | Applications, CV, portfolio link, interview scheduling, 1–5 rating | Internal comments reuse the shared notes subcollection instead of a separate field |
| **Attendance** | Class register, staff check-in, monthly %, CSV export, yearly trend from monthly rollups | No bulk edit |
| **Notifications** | Engine in `src/lib/notify` — email + daily digest | WhatsApp and SMS adapters exist, both unconfigured |
| **Dashboards** | One (Insights) | Principal, Admissions, CRM, Attendance, HR, System |
| **Analytics** | Sources, funnel, referrers | No trends, campaign performance, monthly reports |

The gaps that remain are the two heavy ones — the dashboard suite and online
payment — plus attendance depth and analytics depth. Saying the platform is
finished would be dishonest; so would the earlier version of this table, which
described gaps that four releases had already closed.

### Three CRM features were removed on purpose

Lead **assignment**, lead **tags**, and the Kanban **board view** were built
against the brief and deleted in Sep 2026. None of them failed; they were
answers to a problem this branch does not have. Assignment routes work between
people, and one office shares one console. Tags sort volume, and the volume is a
handful of enquiries a week. The board was a second full rendering of the leads
the list already showed, with its own copies of call, WhatsApp and stage-change.

What went with them: `assignedTo` and `tags` on the lead document (the fields
stay in Firestore, unread), the `lead.assigned` notification event, the
`leadTags` taxonomy, three composite indexes, and the board's per-column read
budget. Bulk **stage** moves stayed — moving six enquiries at once is volume
work that survives at any size.

If the school hires admissions staff, assignment is the one to rebuild first,
and `git log` has it.

### Two remaining gaps are not "next up"

Each looks like a small piece of work and is not, for reasons that live outside
the code. A third — attendance rollups — was on this list until the screen that
reads them was built; see below.

**Resource audiences.** The brief asks for Public, Parents, Students, Teachers,
Staff and Admin. The code has three, and that is not laziness — §5 of
`HANDOVER.md` is the constraint: there are exactly three identities in this
system, and students are not one of them. "Teachers" is what `staff` already
means, and "Admin" is the `owner` role. Adding *Students* would put a choice in
the upload form that no one can ever be. Adding audiences before identities is
how you get a control that gates nothing.

**Gallery.** Blocked on the school, not on code — `docs/school-facts-needed.md`
is still waiting on real campus photographs. A gallery shell shipped now would
be a production page carrying placeholder images.

### The attendance rollup shipped with the screen that reads it

`attendanceRollups/{year}_{class}_{month}` and `/admin/attendance/trends` are
one change, which is what the entry above asked for. A year is ~220 registers
per class, so drawing a trend from the days themselves is ~1,320 reads per view
across six classes; the rollup makes it twelve document reads, addressed by id,
with no query and therefore no index.

It departs from `EXPANSION_PLAN.md` §4.2 in one way, and the reason matters. The
plan says "updated by increment". Increments are wrong here, because the
register is deliberately re-saveable — the page says *you can save again to
correct a day* — and a second save would increment the month a second time,
quietly inflating a year of attendance with no error anywhere. The document
instead holds `days: { "2026-09-17": { present: 12, late: 1, absent: 2 } }`, so
re-saving a day overwrites that day's entry and nothing accumulates. The write
stays in the register's own batch, so a month can never disagree with its days.

Counts are stored under **status ids**, not under present/absent. Whether "late"
counts as present is a settings decision the school can change, and a rollup
that had baked it in would make its own history wrong the day they changed it.
The percentage is derived on read from the statuses as configured now.

## 2. The decision that has to come first

> *"NEVER hardcode mutable values. Everything configurable. Everything editable
> via Admin Panel."*

*This section states the problem as it stood before the settings work. It was
carried out: those constants are stored settings today, read through
`src/lib/settings`. Read it as the argument, not as the current state.*

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

### 3.2 Notification engine (built)

`notify(event, payload)` with channel adapters selected by configuration.
Callers emit domain events and never name a channel; `lib/email.ts` is deleted.

**`notify()` never throws.** A parent's enquiry must be saved even if every
channel is down — losing the lead in order to announce the lead is the worst
possible trade. Channels dispatch in parallel and are isolated from each other,
so a broken email provider cannot stop the in-app notice being written. Verified
by submitting a real enquiry with an invalid Resend key: the lead saved and the
dashboard channel still delivered.

`whatsapp` and `sms` are declared but report themselves unconfigured, so they
are skipped and their toggles are honest about doing nothing yet. Wiring a
provider means replacing one `send` — no route, action or template changes.
That is the extension point working.

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

### 3.3 Audit log (built)

Append-only `auditLog`, written on the **same batch** as the action it records,
so an audited action cannot succeed while its record silently fails. Where a
caller was doing a bare `.update()`, it became a two-write batch — one round
trip, not two.

Three actions record after the fact instead, and only these: deleting a post or
an opening (the document is gone, so there is nothing left to batch against) and
the CSV import (its writes are already chunked across several batches). Each is
commented at the call site.

Retention is a Firestore TTL policy on `expiresAt`, not a cron job — a scheduled
cleanup that silently stops is how audit logs quietly become unbounded.

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
