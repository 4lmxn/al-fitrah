# Expansion plan — Payments, Resource Center, Attendance

Analysis of the three requested features against the system as it stands
(main @ 248 tests, Aug 2026). Written before any code, as asked.

## Status

Against the sequence in §9:

*Status re-verified against the code on 16 Sep 2026. Three rows below said "not
started" for work that had already shipped.*

| Phase | State | Shipped in |
|---|---|---|
| 1 — Identity (parent sign-in, role claims) | ✅ done | #42, #43 |
| 3 — Parent portal, read-only | ✅ done | #42 |
| 2 — Fee structures + assignment | ✅ done | #26 |
| 4 — Gateway abstraction | ⛔ still blocked | needs SBI merchant docs (§10.1). The Razorpay path is not blocked by them |
| 4a — SBI Collect report import | ✅ done | `feat/sbi-collect-import` — reconciles payments already taken offline; not a gateway |
| 5 — Resource Center | ✅ done | #45 — `src/lib/resources.ts`, admin + portal surfaces |
| 6 — Attendance depth + rollups | 🟡 partly | register and staff check-in shipped; `attendanceRollups` not built, so there is still no trend view |
| — `staff` collection (§4.3) | ✅ done | `50380ce` — `src/lib/staff.ts`, roster-driven console access |

Phase 3 shipped ahead of phase 2 because the portal only needed a total to
show, and the totals were being typed in by hand.

**Design change made in phase 2:** the planned `feeAssignments/{studentId}`
collection was dropped. It held exactly one document per student, keyed by
student id, and was read only alongside the student — which is a description of
fields on the student document. The assignment lives in `students/{id}.fees`
instead: one collection fewer, and the portal's single read is preserved by
construction rather than by discipline. Installment *schedules* are also not
built; partial payment already works through the ledger, and no school has yet
asked for dated instalments.

Still open and needing the school, not code: the four questions in §10.

---

## 0. The finding that reorders the brief

**There is no identity for parents, students or teachers.**

Authentication today is Google sign-in gated by `ADMIN_EMAILS`. `isAllowed()`
checks one allowlist; every `/admin` route calls `requireAdmin()`. A parent
cannot sign in at all, and nothing in the data model represents them as a user.

Two of the three features depend on that not being true:

- **Parent Fee Portal** — parents must see *their own* child's fees and nobody
  else's.
- **Resource Center** — the brief's audiences are *Public, Parents, Students,
  Teachers, Staff, Admin*. Four of those six do not exist.

Neither feature lists identity as a requirement, but both are built on top of
it. Building the payment portal admin-only and adding parent login afterwards
means rewriting the access layer of the thing that handles money — the worst
place to retrofit authorisation.

**Recommendation: identity first, as its own phase.** It is roughly a week of
work and it unblocks both features plus teacher attendance.

### What identity should look like

Parents are already in the system: `students.guardians[].phone`. That is the
natural credential — Indian parents reliably have a phone, not reliably an
email, and phone is already the field this system dedupes on.

- **Firebase Auth phone sign-in (OTP)** for parents. No password to reset, no
  email to bounce, and it matches how the school already contacts them.
- Link a signed-in phone to `students` via the existing `guardians[].phone`,
  which is already normalised through `lib/phone`.
- Extend `lib/roles` from a two-value admin role to a role *claim* resolved per
  user: `owner | staff | teacher | parent | student`. The existing
  `requireAdmin`/`requireOwner` gates keep working; a new `requireParent()`
  returns the student ids that user may see.

**Cost note:** Firebase Auth is free to 50k MAU, so identity itself is free.
Phone OTP is **not** — SMS is billed per message. Budget: a school of 200
families signing in occasionally is small, but this is the first feature with a
per-user marginal cost, and it needs a rate limit at the OTP step or it is an
open invitation to burn credit.

---

## 1. What already exists and must be reused, not rebuilt

The brief asks for several services that are already here. Building them again
would be the single biggest waste in this project.

| Brief asks for | Already exists | Action |
|---|---|---|
| Notification Service | `lib/notify` — event dispatcher, adapters, templates in settings | **Extend**: add `payment.received`, `resource.published`, `attendance.absent` events |
| Receipt numbering | `lib/fees.nextReceiptNumber` — transactional, zero-padded | **Reuse as-is** |
| Transaction ledger | `payments/` — append-only, increment-based, `reconcile()` via `sum()` | **Reuse as-is** |
| Audit logs | `lib/audit` — append-only, same-batch, TTL | **Reuse as-is** |
| Export / CSV | `lib/csv` — quoting + CSV-injection guard + BOM | **Reuse as-is** |
| "Everything configurable" | `lib/settings` — typed, cached, admin-editable | **Extend** with new sections |
| RBAC | `lib/roles` | **Extend** to non-admin roles (see §0) |
| Secure file upload | `lib/storage` — magic-byte sniffing, size caps, streamed download | **Extend** for resources |
| Money handling | `lib/money` — integer paise, injection-safe parsing | **Reuse as-is** |
| Attendance service | `lib/attendance` — per-class-day registers | **Extend**, do not replace |

**Feature 1's "Architecture Rules" are already ~60% satisfied.** What is
genuinely missing is the gateway abstraction, webhooks, PDF receipts, and the
parent-facing surface.

---

## 2. Feature 1 — Payments

### 2.1 What exists

`payments/` is already an immutable ledger: one row per payment, `paidPaise`
maintained by `FieldValue.increment`, corrections recorded as negative rows,
`reconcile()` recomputing from the ledger with a `sum()` aggregation. Receipt
numbers allocate inside a transaction.

That is the hard half of a payment system and it is done.

### 2.2 The gateway interface, and why SBI shapes it

The brief lists Razorpay, BillDesk, CCAvenue, SBI and others. These do **not**
share a shape, and an interface modelled on Razorpay will not fit SBI.

- Razorpay: JSON API, client-side checkout, signed **webhook**.
- SBIePay / BillDesk / CCAvenue: server-side **form POST redirect**, response
  returned as a browser redirect *and* a server-to-server callback, integrity
  proved by a **checksum over a pipe-delimited string**, not an HMAC header.

So the interface must express *redirect-based* and *API-based* gateways:

```
initiate(order)  -> { kind: "redirect", url, fields } | { kind: "client", payload }
verify(raw)      -> { ok, gatewayRef, amountPaise, status } | { ok: false, reason }
```

Business logic depends only on `verify()`'s result. Adding a gateway is one file.

### 2.3 The rule that matters most: idempotency

**Payment callbacks are at-least-once.** Gateways retry. A user refreshing the
return page re-submits it. Without idempotency a single ₹25,000 payment credits
twice, and the ledger — the thing designed to be trustworthy — becomes wrong.

**Design: the gateway's transaction reference IS the payment document id.**
A replayed callback is then a `create` that already exists, which fails
naturally, rather than a second `increment`. No dedupe table, no locking.

### 2.4 New collections

- `feeStructures/{id}` — category, amount, academic year, program/class scope,
  installment schedule. Configuration-shaped, so it lives here rather than in
  `settings` (it is per-year data, not per-school config).
- `feeAssignments/{studentId}` — resolved structure + discounts + concessions.
  Written once at assignment, so the portal reads one document, not a join.
- `paymentIntents/{gatewayRef}` — created before redirect, resolved by callback.
  This is what makes a dropped callback recoverable.

`payments/` is unchanged. Online payments are ledger rows with a `gateway` field.

### 2.5 Discounts, late fees, partial payments

All are **amount arithmetic**, and all belong in `lib/money` alongside
`parseRupees` — computed, never stored as a mutable "balance". The balance stays
derived (`total − paid`), which is what makes it impossible to corrupt.

Late fees are the exception worth care: a late fee is a *charge*, not a
discount, so it is a ledger row of its own, created by a scheduled job, and
therefore auditable and reversible. Adjusting a stored total instead would leave
no record of why a family suddenly owes more.

### 2.6 PDF receipts

No PDF library is installed and one is a real dependency decision. Options, in
order of preference:

1. **Server-rendered HTML with a print stylesheet.** Zero dependency, works
   today, and browsers produce a perfectly good PDF. Receipt numbers are already
   allocated, so the document is real either way.
2. A PDF library, only if the school needs a byte-identical attachable file.

Recommend (1) first; it is a day rather than a week, and it may end the
requirement.

---

## 3. Feature 2 — Resource Center

### 3.1 Storage strategy, and a deliberate inconsistency

CV downloads **stream through an authenticated route** — signed URLs were
removed on purpose, because a signed URL is a bearer token that lands in browser
history and leaks by `Referer`.

Resources will use **signed URLs**, and the difference is principled:

| | CVs | Resources |
|---|---|---|
| Content | one identifiable person's PII | material shared with a class |
| Size | small | large (videos, ZIPs) |
| Leak impact | a named individual's data | a worksheet |
| CDN value | none | high |

Signed URLs here are short-lived (15 min), issued only after a role check, and
audited. Public resources are served from the existing `content/` prefix with no
signing at all.

**What must not happen:** resources and `applications/` sharing a prefix or a
rule. The Storage rules keep them disjoint, as they are today.

### 3.2 Schema

`resources/{id}` — metadata only, never file bytes. Fields per the brief plus
`storagePath`, `audience[]`, `academicYear`, `class`, `subject`, `category`,
`version`, `expiresAt`, `archived`.

Counters (`downloadCount`, `viewCount`) are **`FieldValue.increment`, never
read-modify-write** — the same discipline as `paidPaise`, and for the same
reason: two parents downloading simultaneously must not lose a count.

`versions` as a subcollection, because "Replace File" implies history and an
array would grow unbounded on the document.

### 3.3 Virus scanning

A **hook**, not an implementation: uploads land with `scanStatus: "pending"` and
are not downloadable until marked clean. Wiring a scanner later changes one
function. Shipping without the hook means retrofitting a state machine into a
collection that already has documents.

---

## 4. Feature 3 — Attendance

### 4.1 Keep the shape

One document per class-day, holding a student→status map. That decision is why
attendance costs 132 writes/month instead of 2,640. Everything below extends it.

### 4.2 The cost risk: yearly analytics

A year is ~220 registers per class. "Yearly trends" across six classes is ~1,320
reads *per dashboard view*. That breaks the flat-cost property.

**Design: monthly rollups written on register save.** One
`attendanceRollups/{year}_{class}_{month}` document, updated by increment in the
same batch as the register. A yearly view then reads 12 documents per class, not
220. Trends and dashboards read rollups; only the register itself reads days.

### 4.3 Teacher attendance needs a `staff` collection

Teachers currently exist only as `staff_application` leads that reached "hired".
A lead is a *record of a hiring*, not an employee — it has no employment dates,
no designation, no attendance history.

`staff/{id}`, created from a hired application exactly as `students` is created
from an admitted lead. Same pattern, already proven, and it is also the identity
anchor for teacher logins.

### 4.4 Holidays and leave

`settings.attendance` already holds `nonSchoolDays`. A holiday **calendar** is
dated exceptions, so: `holidays/{academicYear}` — one document holding a map of
date → reason. One read, cached, and it makes "Holiday" a first-class status
rather than a gap in the data.

---

## 5. Database changes

| Collection | Status | Notes |
|---|---|---|
| `feeStructures` | new | per-year fee definitions |
| `feeAssignments` | new | resolved per student; one read for the portal |
| `paymentIntents` | new | pre-redirect state; makes dropped callbacks recoverable |
| `payments` | **unchanged** | online rows gain a `gateway` field |
| `resources` | new | metadata only |
| `resources/{id}/versions` | new | replace-file history |
| `staff` | new | employees, from hired applications |
| `attendanceRollups` | new | monthly aggregates; keeps analytics flat-cost |
| `holidays` | new | one document per academic year |
| `students` | extend | `guardianUids[]` for parent linking |

Indexes: every new query gets a declared composite; no query ships without one.

---

## 6. API and UI changes

**New routes:** `/api/payments/initiate`, `/api/payments/callback/[gateway]`
(unauthenticated but checksum-verified, rate-limited), `/portal/*` (parent
surface), `/admin/fees/*`, `/admin/resources/*`, `/resources` (public subset).

**Reused:** every admin form keeps `ActionForm` + `ActionResult`; every mutation
keeps `queueAudit`; every list keeps cursor pagination.

---

## 7. Migration steps

1. Backfill `students.guardianUids` as empty arrays (explicit, not absent — the
   same lesson as `noteCount` and `assignedTo`).
2. Create `staff` from existing hired applications, if any.
3. Backfill `attendanceRollups` from existing registers — idempotent, additive,
   re-runnable, same shape as `migrate-notes.mjs`.
4. No destructive migration anywhere. Nothing existing changes shape.

---

## 8. Risks, honestly

| Risk | Severity | Mitigation |
|---|---|---|
| **Double-crediting a payment** | Critical | Gateway ref as document id; replay fails as a duplicate create |
| **A parent seeing another child's fees** | Critical | Authorisation resolved server-side from the signed-in uid; never from a query parameter |
| **Dropped gateway callback** | High | `paymentIntents` + a reconciliation job that queries the gateway for unresolved intents |
| **SBI's actual integration differs from assumption** | High | No gateway built until the merchant docs are in hand; the interface is written against two known shapes |
| **OTP cost abuse** | Medium | Rate limit per phone and per IP at the OTP step |
| **Analytics reads growing yearly** | Medium | Rollups, above |
| **Resource signed URL shared onward** | Medium | 15-minute expiry, audited issuance, never used for individual PII |
| **Scope** | High | This is months of work. Sequenced below; each phase ships independently. |

---

## 9. Sequence

Each phase is independently useful and independently shippable.

1. **Identity** — parent phone auth, role claims, `staff` collection. *Blocks 2 and 3.*
2. **Fee structures + assignment + admin fee management.** Offline payments only. Useful immediately: the school can define fees and record cash.
3. **Parent portal, read-only.** Balance, history, receipts. No gateway yet.
4. **Gateway abstraction + one real gateway**, once SBI's documentation is available.
5. **Resource Center.**
6. **Attendance depth + rollups + dashboards.**

Dashboards stay last, as before: a dashboard over incomplete data teaches the
wrong thing confidently.

---

## 10. What I need from the school before building

1. **SBI merchant documentation** — integration kit, test credentials, whether
   it is SBIePay or an aggregator. The gateway is not built without it.
2. **Do parents sign in by phone OTP?** Recommended, but it has a per-message
   cost and it is the school's bill.
3. **Is partial payment allowed, and is there a minimum?** The brief says
   configurable; the school has to supply the policy.
4. **Late fee policy** — flat or per-day, grace period, cap.
