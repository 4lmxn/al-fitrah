# Postgres Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the relational Postgres schema and a typed, server-only query layer that will become the new source of truth, without touching the live Firebase-backed app yet.

**Architecture:** Hand-written SQL migrations in `db/migrations/`, applied by a small custom runner (`scripts/db/migrate.mjs`) against local Postgres (Docker for dev, RDS later). A new `src/lib/db/` tree holds the pg client and one query module per domain, mirroring today's `src/lib/{students,leads,fees,attendance,audit}.ts` file-for-file so the eventual swap-over (a later plan) is a clean 1:1 replacement. Nothing in `src/app/**` or the existing `src/lib/firebase*.ts` files changes in this plan — this is net-new code living beside the old system, proven correct on its own before anything is wired in.

**Tech Stack:** `pg` (node-postgres, official client — new dependency, ~/dev only needs Docker) — no ORM. Rationale: the existing codebase already talks to its database with hand-written queries via the Firestore Admin SDK, not an ORM; `pg` + plain SQL keeps that same shape and this schema is small enough (12 tables) that an ORM would add a learning surface without saving real code. Vitest for the query-layer tests (already a project dependency), run against a real local Postgres in Docker — no mocking the database.

**Spec:** User-provided migration spec (Firebase → Cloudflare/AWS/Postgres), Phases 1–3. This plan implements the audit-informed version of those phases — see the audit posted in-conversation on 2026-08-18 for what was found in the existing Firestore data model and why some entities below diverge from the spec's example list (e.g. no separate `enquiries` table — `leads` already covers it; `guardians` normalized out of the student document instead of kept as a JSON array, because Postgres can join where Firestore couldn't).

## Global Constraints

- Money is integer paise (`BIGINT`), never floating point — matches the existing `amountPaise`/`totalPaise`/`paidPaise` convention in `src/lib/fees.ts`.
- Every table gets `created_at timestamptz not null default now()`; mutable tables also get `updated_at`. `payments` and `audit_log` are append-only — no `updated_at`, and app-level DB roles get `UPDATE`/`DELETE` revoked on them in migration 007.
- Primary keys are `uuid default gen_random_uuid()` (native in Postgres 13+, no extension needed). Business-facing identifiers (`admission_number`, `receipt_number`, `slug`) are separate unique columns, not primary keys — same split the Firestore version already has between document id and display id.
- No table for data that's genuinely just admin-editable config (pipeline stage labels, notification templates, taxonomy display lists) — that stays JSONB in `app_settings`, one row, matching the existing single "settings document" pattern in `src/lib/settings/schema.ts`. Only entities with real referential integrity needs (`programs`, `class_sections`, `academic_years`, the role/permission graph) become first-class tables.
- Every migration file is forward-only SQL, numbered `NNN_description.sql`, applied in order, tracked in a `schema_migrations` table. No down-migrations for this plan — at this stage (pre-cutover, no production data in Postgres yet) a broken migration gets fixed and re-applied to a dropped-and-recreated local database, not rolled back.

---

## File Structure

```
db/
  migrations/
    001_lookups_and_settings.sql
    002_users_roles_permissions.sql
    003_leads.sql
    004_students_guardians.sql
    005_payments.sql
    006_attendance.sql
    007_content_and_audit.sql
    008_lock_down_append_only.sql
docker-compose.yml                  # local Postgres for dev/test
scripts/
  db/
    migrate.mjs                     # forward-only migration runner
    seed.mjs                        # local dev seed data
src/
  lib/
    db/
      client.ts                     # pg Pool, getPool()
      queries/
        settings.ts
        students.ts
        leads.ts
        fees.ts
        attendance.ts
        audit.ts
        content.ts                  # job_openings + posts
      queries/__tests__/
        students.test.ts
        leads.test.ts
        fees.test.ts
        attendance.test.ts
        audit.test.ts
        content.test.ts
        settings.test.ts
```

---

### Task 1: Local Postgres + connection client

**Files:**
- Create: `docker-compose.yml`
- Create: `src/lib/db/client.ts`
- Create: `.env.example` addition (append, don't replace existing file)
- Test: `src/lib/db/client.test.ts`

**Interfaces:**
- Produces: `getPool(): pg.Pool` — the single shared connection pool every query module imports.

- [ ] **Step 1: Add `pg` dependency**

Run: `npm install pg && npm install -D @types/pg`

This adds the official Postgres client. Tell the user before running it (per project convention): it's the standard, officially-maintained Node Postgres driver — no ORM, no query builder, just parameterized SQL.

- [ ] **Step 2: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: alfitrah
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: alfitrah
    ports:
      - "5432:5432"
    volumes:
      - alfitrah_pg_data:/var/lib/postgresql/data
volumes:
  alfitrah_pg_data:
```

- [ ] **Step 3: Start it and verify**

Run: `docker compose up -d postgres && sleep 2 && docker compose exec postgres pg_isready -U alfitrah`
Expected: `accepting connections`

- [ ] **Step 4: Append to `.env.example`**

```
# Postgres (local: docker compose up -d postgres)
DATABASE_URL="postgres://alfitrah:localdev@localhost:5432/alfitrah"
```

Also add `DATABASE_URL="postgres://alfitrah:localdev@localhost:5432/alfitrah"` to `.env.local` (not committed — this file is already gitignored).

- [ ] **Step 5: Write the failing test**

```typescript
// src/lib/db/client.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { getPool } from "./client";

describe("getPool", () => {
  afterAll(async () => {
    await getPool().end();
  });

  it("connects and returns the server time", async () => {
    const pool = getPool();
    const result = await pool.query("select 1 + 1 as sum");
    expect(result.rows[0].sum).toBe(2);
  });

  it("returns the same pool instance on repeated calls", () => {
    expect(getPool()).toBe(getPool());
  });
});
```

- [ ] **Step 6: Run it, confirm it fails**

Run: `npx vitest run src/lib/db/client.test.ts`
Expected: FAIL — `Cannot find module './client'`

- [ ] **Step 7: Implement the client**

```typescript
// src/lib/db/client.ts
import "server-only";
import { Pool } from "pg";

let pool: Pool | undefined;

/**
 * Shared connection pool, created once per server process.
 *
 * Firestore's Admin SDK managed its own connection lifecycle; a raw pg client
 * doesn't, so this exists to make sure every query module in lib/db/queries
 * shares one pool instead of each opening its own.
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. See .env.example.");
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}
```

- [ ] **Step 8: Run it, confirm it passes**

Run: `npx vitest run src/lib/db/client.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yml src/lib/db/client.ts src/lib/db/client.test.ts .env.example package.json package-lock.json
git commit -m "feat: add postgres connection pool and local dev compose"
```

---

### Task 2: Migration runner

**Files:**
- Create: `scripts/db/migrate.mjs`
- Create: `db/migrations/000_schema_migrations.sql`

**Interfaces:**
- Produces: `npm run db:migrate` — applies every `db/migrations/*.sql` file not yet recorded in `schema_migrations`, in filename order, each inside its own transaction.

- [ ] **Step 1: Write the bootstrap migration**

```sql
-- db/migrations/000_schema_migrations.sql
create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
```

- [ ] **Step 2: Write the runner**

```javascript
// scripts/db/migrate.mjs
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const MIGRATIONS_DIR = path.join(import.meta.dirname, "..", "..", "db", "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    // The bootstrap file creates schema_migrations itself, so it can't be
    // recorded in a table that doesn't exist yet when it runs — apply it
    // unconditionally first, then track everything after it.
    const [bootstrap, ...rest] = files;
    if (bootstrap !== "000_schema_migrations.sql") {
      throw new Error(`Expected 000_schema_migrations.sql first, found ${bootstrap}`);
    }
    await client.query(await readFile(path.join(MIGRATIONS_DIR, bootstrap), "utf8"));

    const { rows: applied } = await client.query("select filename from schema_migrations");
    const appliedSet = new Set(applied.map((r) => r.filename));

    for (const file of rest) {
      if (appliedSet.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Applying ${file}...`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (filename) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err });
      }
    }
    console.log("Migrations up to date.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Wire it into package.json**

Add to `scripts` in `package.json`:
```json
"db:migrate": "node scripts/db/migrate.mjs"
```

- [ ] **Step 4: Run it against the empty local database**

Run: `npm run db:migrate`
Expected: `Migrations up to date.` (no migrations to apply yet beyond the bootstrap)

- [ ] **Step 5: Verify the tracking table exists**

Run: `docker compose exec postgres psql -U alfitrah -c "\d schema_migrations"`
Expected: table description showing `filename` and `applied_at` columns

- [ ] **Step 6: Commit**

```bash
git add scripts/db/migrate.mjs db/migrations/000_schema_migrations.sql package.json
git commit -m "feat: add forward-only migration runner"
```

---

### Task 3: Lookup tables + settings

**Files:**
- Create: `db/migrations/001_lookups_and_settings.sql`

**Interfaces:**
- Produces: `academic_years`, `programs`, `class_sections`, `app_settings` — referenced by every later migration.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/001_lookups_and_settings.sql

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  -- "2026-27" — matches academicYearFor() in src/lib/students.ts exactly,
  -- so the eventual data migration can copy this string verbatim.
  label text not null unique,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table class_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Single-row config blob: pipeline stage definitions, taxonomy display lists
-- (lead sources, employment types, payment methods, lead tags), attendance
-- status definitions, notification templates, feature flags. All of this is
-- admin-edited JSON with no relational structure worth enforcing at the
-- database level — validated by the existing Zod schema
-- (src/lib/settings/schema.ts) at the application boundary instead.
create table app_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Per-year, per-kind counters for human-facing sequence numbers
-- (admission numbers, receipt numbers). Firestore derived these by scanning
-- for the highest existing value inside a transaction; Postgres has a
-- simpler primitive for this — a locked counter row, incremented with
-- SELECT ... FOR UPDATE inside a transaction. See Task 11 and Task 12.
create table id_sequences (
  key text primary key,
  last_value integer not null default 0
);
```

- [ ] **Step 2: Apply it**

Run: `npm run db:migrate`
Expected: `Applying 001_lookups_and_settings.sql...` then `Migrations up to date.`

- [ ] **Step 3: Verify**

Run: `docker compose exec postgres psql -U alfitrah -c "\dt"`
Expected: lists `academic_years`, `programs`, `class_sections`, `app_settings`, `id_sequences`, `schema_migrations`

- [ ] **Step 4: Commit**

```bash
git add db/migrations/001_lookups_and_settings.sql
git commit -m "feat: add lookup tables and settings blob"
```

---

### Task 4: Users, roles, permissions

**Files:**
- Create: `db/migrations/002_users_roles_permissions.sql`

**Interfaces:**
- Produces: `users` (with `cognito_sub` column, unused until the Cognito plan wires it up), `roles`, `permissions`, `role_permissions`.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/002_users_roles_permissions.sql

create table roles (
  id uuid primary key default gen_random_uuid(),
  -- "owner" / "staff" today, matching src/lib/roles.ts. More roles (teacher,
  -- accountant) get added here later without a schema change.
  key text not null unique,
  label text not null
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  -- Dotted form, e.g. "students.write" — matches the permission naming in
  -- the migration spec exactly.
  key text not null unique,
  label text not null
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table users (
  id uuid primary key default gen_random_uuid(),
  -- Nullable for now: this plan doesn't wire up Cognito. Filled in by the
  -- Cognito migration plan, at which point it becomes the join key between
  -- "who is this person" (Cognito) and "what can they do" (this table).
  cognito_sub text unique,
  email text not null unique,
  display_name text,
  role_id uuid not null references roles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_id_idx on users(role_id);

insert into roles (key, label) values
  ('owner', 'Owner'),
  ('staff', 'Staff');

insert into permissions (key, label) values
  ('students.read', 'View students'),
  ('students.write', 'Edit students'),
  ('attendance.read', 'View attendance'),
  ('attendance.write', 'Mark attendance'),
  ('fees.read', 'View fees'),
  ('fees.write', 'Record payments'),
  ('fees.manage', 'Manage fee structures'),
  ('admissions.read', 'View admissions pipeline'),
  ('admissions.write', 'Edit admissions pipeline'),
  ('content.write', 'Edit site content'),
  ('openings.write', 'Manage job openings'),
  ('audit.read', 'View audit log'),
  ('settings.write', 'Edit platform settings'),
  ('users.manage', 'Manage staff accounts');

-- "owner" gets everything, including the destructive/admin-only ones
-- (settings.write, users.manage) that today gate on requireOwner() in
-- src/lib/adminAuth.ts.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p where r.key = 'owner';

-- "staff" gets everything except settings.write and users.manage — the same
-- split requireOwner() already enforces.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.key not in ('settings.write', 'users.manage')
where r.key = 'staff';
```

- [ ] **Step 2: Apply it**

Run: `npm run db:migrate`
Expected: `Applying 002_users_roles_permissions.sql...` then `Migrations up to date.`

- [ ] **Step 3: Verify the permission split**

Run: `docker compose exec postgres psql -U alfitrah -c "select r.key, count(*) from role_permissions rp join roles r on r.id = rp.role_id group by r.key"`
Expected: `owner | 14`, `staff | 12`

- [ ] **Step 4: Commit**

```bash
git add db/migrations/002_users_roles_permissions.sql
git commit -m "feat: add users, roles, and permission model"
```

---

### Task 5: Leads + lead notes

**Files:**
- Create: `db/migrations/003_leads.sql`

**Interfaces:**
- Produces: `leads`, `lead_notes`.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/003_leads.sql

create table leads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('admission_inquiry', 'staff_application')),
  parent_name text not null,
  child_name text,
  phone text not null,
  -- Normalized form of `phone`, used for duplicate detection — see
  -- src/lib/leadDedupe.ts phoneKey(). Indexed, not unique: duplicates are
  -- flagged for a human, not blocked outright.
  phone_key text not null,
  whatsapp boolean not null default false,
  email text,
  child_age_band text check (child_age_band in ('below', 'eligible', 'above')),
  child_dob text,
  program_id uuid references programs(id),
  message text,
  stage text not null default 'new',
  assigned_to uuid references users(id),
  note_count integer not null default 0,
  possible_duplicate_of uuid references leads(id),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referred_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_phone_key_idx on leads(phone_key);
create index leads_type_stage_idx on leads(type, stage);
create index leads_assigned_to_idx on leads(assigned_to);

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  text text not null,
  author text not null,
  kind text not null check (kind in ('note', 'stage')),
  created_at timestamptz not null default now()
);

create index lead_notes_lead_id_idx on lead_notes(lead_id, created_at desc);
```

- [ ] **Step 2: Apply and verify**

Run: `npm run db:migrate && docker compose exec postgres psql -U alfitrah -c "\d leads"`
Expected: table description listing all columns above

- [ ] **Step 3: Commit**

```bash
git add db/migrations/003_leads.sql
git commit -m "feat: add leads and lead notes tables"
```

---

### Task 6: Students + guardians

**Files:**
- Create: `db/migrations/004_students_guardians.sql`

**Interfaces:**
- Produces: `students`, `guardians`.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/004_students_guardians.sql

create table students (
  id uuid primary key default gen_random_uuid(),
  -- "AF-2026-0001" — see nextAdmissionNumber() in src/lib/students.ts,
  -- reimplemented against id_sequences in Task 11.
  admission_number text not null unique,
  first_name text not null,
  last_name text not null default '',
  dob date,
  program_id uuid references programs(id),
  class_section_id uuid references class_sections(id),
  academic_year_id uuid not null references academic_years(id),
  status text not null default 'enrolled' check (status in ('enrolled', 'withdrawn', 'graduated')),
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  -- Kept as a JSONB blob rather than a separate table, matching the existing
  -- deliberate choice in src/lib/students.ts: health data a teacher needs in
  -- the moment something goes wrong belongs on the same row as the student,
  -- not behind a second query that can fail independently.
  medical jsonb,
  lead_id uuid references leads(id),
  total_fees_paise bigint not null default 0,
  lead_id_unique_check uuid generated always as (lead_id) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A lead converts to at most one student — guards double conversion, same
-- as studentForLead() in src/lib/students.ts today (query-time check) but
-- enforced at the database level here instead.
create unique index students_lead_id_unique_idx on students(lead_id) where lead_id is not null;
create index students_status_idx on students(status);
create index students_class_section_idx on students(class_section_id);

-- Normalized out of the guardians[] array the Firestore version denormalized
-- into guardianPhones/guardianEmails specifically because Firestore cannot
-- query inside an array of objects. Postgres can join, so the flat arrays
-- and the duplication they existed to avoid both go away here.
create table guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  name text not null,
  phone text not null,
  phone_normalized text not null,
  email text,
  relationship text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- The parent portal signs a guardian in by phone or email — this is the
-- index that lookup runs on, replacing Student.guardianPhones/guardianEmails.
create index guardians_phone_normalized_idx on guardians(phone_normalized);
create index guardians_email_idx on guardians(lower(email)) where email is not null;
create index guardians_student_id_idx on guardians(student_id);
```

- [ ] **Step 2: Apply and verify**

Run: `npm run db:migrate && docker compose exec postgres psql -U alfitrah -c "\d guardians"`
Expected: table description with the FK to `students`

- [ ] **Step 3: Commit**

```bash
git add db/migrations/004_students_guardians.sql
git commit -m "feat: add students and normalized guardians tables"
```

---

### Task 7: Payments ledger

**Files:**
- Create: `db/migrations/005_payments.sql`

**Interfaces:**
- Produces: `payments`.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/005_payments.sql

-- Append-only ledger — same principle as src/lib/fees.ts today: a payment
-- row is never updated or deleted, a correction is a new negative-amount
-- row. UPDATE/DELETE get revoked from the app role in migration 008, once
-- that role exists.
create table payments (
  id uuid primary key default gen_random_uuid(),
  -- "RCP-2026-0001" — see nextReceiptNumber() in src/lib/fees.ts,
  -- reimplemented against id_sequences in Task 12.
  receipt_number text not null unique,
  student_id uuid not null references students(id),
  amount_paise bigint not null,
  method text not null default 'cash',
  reference text,
  note text,
  received_at timestamptz not null default now(),
  recorded_by uuid not null references users(id)
);

create index payments_student_id_idx on payments(student_id, received_at desc);
```

- [ ] **Step 2: Apply and verify**

Run: `npm run db:migrate && docker compose exec postgres psql -U alfitrah -c "\d payments"`
Expected: table description, no `updated_at` column present (append-only, matching Global Constraints)

- [ ] **Step 3: Commit**

```bash
git add db/migrations/005_payments.sql
git commit -m "feat: add append-only payments ledger"
```

---

### Task 8: Attendance

**Files:**
- Create: `db/migrations/006_attendance.sql`

**Interfaces:**
- Produces: `attendance_registers`, `attendance_records`.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/006_attendance.sql

-- One row per class per day — who marked it and when. Firestore modeled the
-- whole register (every student's status) as a single document for write
-- economy (see the comment in src/lib/attendance.ts). Postgres doesn't
-- charge per document, so that tradeoff doesn't apply here: registers and
-- records split into two tables, which makes "this student's attendance
-- history" a direct indexed query instead of a scan across register blobs.
create table attendance_registers (
  id uuid primary key default gen_random_uuid(),
  class_section_id uuid not null references class_sections(id),
  academic_year_id uuid not null references academic_years(id),
  date date not null,
  marked_by uuid references users(id),
  marked_at timestamptz,
  created_at timestamptz not null default now()
);

-- One register per class per day — this IS the duplicate-attendance guard
-- the spec asks for.
create unique index attendance_registers_class_date_idx
  on attendance_registers(class_section_id, date);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  register_id uuid not null references attendance_registers(id) on delete cascade,
  student_id uuid not null references students(id),
  status text not null,
  created_at timestamptz not null default now()
);

-- One status per student per register — the second half of the
-- duplicate-attendance guard.
create unique index attendance_records_register_student_idx
  on attendance_records(register_id, student_id);

-- Powers "this student's attendance history/percentage" without touching
-- attendance_registers at all.
create index attendance_records_student_id_idx on attendance_records(student_id);
```

- [ ] **Step 2: Apply and verify**

Run: `npm run db:migrate && docker compose exec postgres psql -U alfitrah -c "\d attendance_records"`
Expected: table description with both unique/foreign-key constraints listed

- [ ] **Step 3: Commit**

```bash
git add db/migrations/006_attendance.sql
git commit -m "feat: add attendance registers and records"
```

---

### Task 9: Content (job openings, posts) + audit log + file documents

**Files:**
- Create: `db/migrations/007_content_and_audit.sql`

**Interfaces:**
- Produces: `job_openings`, `posts`, `audit_log`, `file_documents`.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/007_content_and_audit.sql

create table job_openings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  employment_type text not null default 'Full-time',
  summary text not null default '',
  requirements text[] not null default '{}',
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_openings_active_idx on job_openings(active);

create table posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('news', 'event')),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  body text not null default '',
  image_url text,
  image_path text,
  event_date date,
  location text,
  published boolean not null default false,
  published_at timestamptz,
  author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_published_idx on posts(published, published_at desc);
create index posts_type_idx on posts(type, published, published_at desc);

-- Append-only, same principle as payments. No update/delete path in the
-- query layer, and migration 008 revokes both at the database level.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  summary text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  -- Two-year retention, matching RETENTION_DAYS in src/lib/audit.ts.
  -- Firestore enforces this with a native TTL policy; Postgres has no
  -- equivalent, so a scheduled job (added when this system goes live on
  -- RDS, via pg_cron or an application cron) deletes rows where
  -- expires_at < now().
  expires_at timestamptz not null
);

create index audit_log_created_at_idx on audit_log(created_at desc);
create index audit_log_entity_idx on audit_log(entity_type, entity_id);
create index audit_log_expires_at_idx on audit_log(expires_at);

-- Metadata for files that live in Cloudflare R2 (added in a later plan).
-- Binary content never touches Postgres — only the pointer to it.
create table file_documents (
  id uuid primary key default gen_random_uuid(),
  r2_key text not null unique,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  owner_id uuid references users(id),
  resource_type text not null,
  related_entity_type text,
  related_entity_id uuid,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index file_documents_related_idx on file_documents(related_entity_type, related_entity_id);
```

- [ ] **Step 2: Apply and verify**

Run: `npm run db:migrate && docker compose exec postgres psql -U alfitrah -c "\dt"`
Expected: 13 application tables plus `schema_migrations`

- [ ] **Step 3: Commit**

```bash
git add db/migrations/007_content_and_audit.sql
git commit -m "feat: add content, audit log, and file document tables"
```

---

### Task 10: Lock down append-only tables

**Files:**
- Create: `db/migrations/008_lock_down_append_only.sql`

**Interfaces:**
- Consumes: `payments`, `audit_log` from Tasks 7 and 9.

- [ ] **Step 1: Write the migration**

```sql
-- db/migrations/008_lock_down_append_only.sql

-- A dedicated application role, distinct from the migration/superuser role
-- (whatever DATABASE_URL's user is — the migration runner and admin tasks
-- keep using that one). The app connects as this role once RDS is live;
-- locally it's created here so the revoke below is testable now.
do $$
begin
  if not exists (select from pg_roles where rolname = 'alfitrah_app') then
    create role alfitrah_app with login password 'localdev_app';
  end if;
end
$$;

grant connect on database alfitrah to alfitrah_app;
grant usage on schema public to alfitrah_app;
grant select, insert, update, delete on all tables in schema public to alfitrah_app;

-- The actual lockdown: the app role can insert and read the ledger and the
-- audit trail, but cannot rewrite or erase history. Corrections are new
-- rows (a negative-amount payment, a new audit entry), never edits — same
-- rule as the Firestore version, now enforced by the database instead of
-- only by convention in the query layer.
revoke update, delete on payments from alfitrah_app;
revoke update, delete on audit_log from alfitrah_app;
```

- [ ] **Step 2: Apply it**

Run: `npm run db:migrate`
Expected: `Applying 008_lock_down_append_only.sql...` then `Migrations up to date.`

- [ ] **Step 3: Verify the lockdown actually holds**

Run:
```bash
docker compose exec postgres psql -U alfitrah -d alfitrah -c "
set role alfitrah_app;
insert into payments (receipt_number, student_id, amount_paise, recorded_by)
  select 'RCP-TEST-0001', id, 100, id from students limit 1;
"
```
This will fail with "no student rows" on an empty database — that's fine, the point is the next command:

Run: `docker compose exec postgres psql -U alfitrah -d alfitrah -c "set role alfitrah_app; delete from payments;"`
Expected: `ERROR: permission denied for table payments`

- [ ] **Step 4: Commit**

```bash
git add db/migrations/008_lock_down_append_only.sql
git commit -m "feat: revoke update/delete on append-only ledger and audit log"
```

---

### Task 11: Query layer — students

**Files:**
- Create: `src/lib/db/queries/students.ts`
- Test: `src/lib/db/queries/__tests__/students.test.ts`

**Interfaces:**
- Consumes: `getPool()` from Task 1.
- Produces: `nextAdmissionNumber(client, academicYearLabel): Promise<string>`, `createStudent(input): Promise<Student>`, `listStudents(opts): Promise<StudentList>`, `getStudent(id): Promise<Student | null>`, `listClassRoster(classSectionId): Promise<Student[]>` — same names and shapes as `src/lib/students.ts` today, so the later swap-over plan is a mechanical import change, not a rewrite of callers.

- [ ] **Step 1: Write the failing test for admission numbers**

```typescript
// src/lib/db/queries/__tests__/students.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getPool } from "../../client";
import { nextAdmissionNumber, createStudent, listStudents, getStudent } from "../students";

let academicYearId: string;
let programId: string;
let classSectionId: string;

beforeAll(async () => {
  const pool = getPool();
  const year = await pool.query(
    `insert into academic_years (label, start_date, end_date) values ('2026-27', '2026-06-01', '2027-05-31') returning id`,
  );
  academicYearId = year.rows[0].id;
  const program = await pool.query(`insert into programs (name) values ('Pre-KG') returning id`);
  programId = program.rows[0].id;
  const section = await pool.query(`insert into class_sections (name) values ('Rose') returning id`);
  classSectionId = section.rows[0].id;
});

afterAll(async () => {
  const pool = getPool();
  await pool.query("delete from students");
  await pool.query("delete from class_sections");
  await pool.query("delete from programs");
  await pool.query("delete from academic_years");
  await pool.end();
});

beforeEach(async () => {
  await getPool().query("delete from students");
});

describe("nextAdmissionNumber", () => {
  it("starts at 0001 for a year with no students", async () => {
    const num = await nextAdmissionNumber("2026-27");
    expect(num).toBe("AF-2026-0001");
  });

  it("increments on repeated calls", async () => {
    const first = await nextAdmissionNumber("2026-27");
    const second = await nextAdmissionNumber("2027-28");
    expect(first).toBe("AF-2026-0001");
    expect(second).toBe("AF-2027-0001");
  });
});

describe("createStudent + listStudents", () => {
  it("creates a student and lists it back with correct counts", async () => {
    const student = await createStudent({
      firstName: "Zayn",
      lastName: "Ahmed",
      programId,
      classSectionId,
      academicYearId,
      status: "enrolled",
      guardians: [
        { name: "Fatima Ahmed", phone: "+919886012345", email: "fatima@example.com", relationship: "Mother", isPrimary: true },
      ],
    });

    expect(student.admissionNumber).toBe("AF-2026-0001");
    expect(student.fullName).toBe("Zayn Ahmed");

    const list = await listStudents({});
    expect(list.rows).toHaveLength(1);
    expect(list.counts.enrolled).toBe(1);
    expect(list.counts.withdrawn).toBe(0);

    const fetched = await getStudent(student.id);
    expect(fetched?.guardians[0].phone).toBe("+919886012345");
  });

  it("paginates with a cursor on admission_number", async () => {
    for (let i = 0; i < 3; i++) {
      await createStudent({
        firstName: `Child${i}`,
        lastName: "Test",
        programId,
        classSectionId,
        academicYearId,
        status: "enrolled",
        guardians: [],
      });
    }
    const firstPage = await listStudents({ pageSize: 2 });
    expect(firstPage.rows).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await listStudents({ pageSize: 2, cursor: firstPage.nextCursor! });
    expect(secondPage.rows).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/lib/db/queries/__tests__/students.test.ts`
Expected: FAIL — `Cannot find module '../students'`

- [ ] **Step 3: Implement the query module**

```typescript
// src/lib/db/queries/students.ts
import "server-only";
import { getPool } from "../client";

export type StudentStatus = "enrolled" | "withdrawn" | "graduated";
export const STUDENT_STATUSES: StudentStatus[] = ["enrolled", "withdrawn", "graduated"];

export type Guardian = {
  name: string;
  phone: string;
  email: string | null;
  relationship: string;
  isPrimary: boolean;
};

export type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dob: string | null;
  programId: string | null;
  classSectionId: string | null;
  academicYearId: string;
  status: StudentStatus;
  guardians: Guardian[];
  leadId: string | null;
  totalFeesPaise: number;
  createdAt: string;
  updatedAt: string;
};

export const PAGE_SIZE = 25;

/**
 * Next admission number for a year, as "AF-2026-0001".
 *
 * Reimplements nextAdmissionNumber() from src/lib/students.ts against a
 * locked counter row instead of a "read the highest existing value inside a
 * transaction" scan — Postgres's SELECT ... FOR UPDATE is the direct
 * primitive for "increment this exactly once, even under concurrent calls,"
 * which is what the original comment says a transaction was standing in for.
 */
export async function nextAdmissionNumber(academicYearLabel: string): Promise<string> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const key = `admission:${academicYearLabel}`;
    await client.query(
      `insert into id_sequences (key, last_value) values ($1, 0)
       on conflict (key) do nothing`,
      [key],
    );
    const result = await client.query(
      `update id_sequences set last_value = last_value + 1 where key = $1 returning last_value`,
      [key],
    );
    await client.query("commit");
    const seq = result.rows[0].last_value;
    const year = academicYearLabel.split("-")[0];
    return `AF-${year}-${String(seq).padStart(4, "0")}`;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

function toStudent(row: Record<string, unknown>, guardians: Guardian[]): Student {
  const firstName = String(row.first_name ?? "");
  const lastName = String(row.last_name ?? "");
  return {
    id: String(row.id),
    admissionNumber: String(row.admission_number),
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || "—",
    dob: row.dob ? String(row.dob) : null,
    programId: row.program_id ? String(row.program_id) : null,
    classSectionId: row.class_section_id ? String(row.class_section_id) : null,
    academicYearId: String(row.academic_year_id),
    status: row.status as StudentStatus,
    guardians,
    leadId: row.lead_id ? String(row.lead_id) : null,
    totalFeesPaise: Number(row.total_fees_paise),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export type CreateStudentInput = {
  firstName: string;
  lastName: string;
  dob?: string;
  programId: string;
  classSectionId: string;
  academicYearId: string;
  academicYearLabel?: string;
  status: StudentStatus;
  leadId?: string;
  guardians: Guardian[];
};

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const yearLabel =
      input.academicYearLabel ??
      (await client.query(`select label from academic_years where id = $1`, [input.academicYearId])).rows[0].label;
    const admissionNumber = await nextAdmissionNumber(yearLabel);

    const studentResult = await client.query(
      `insert into students
        (admission_number, first_name, last_name, dob, program_id, class_section_id, academic_year_id, status, lead_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        admissionNumber,
        input.firstName,
        input.lastName,
        input.dob ?? null,
        input.programId,
        input.classSectionId,
        input.academicYearId,
        input.status,
        input.leadId ?? null,
      ],
    );
    const row = studentResult.rows[0];

    for (const g of input.guardians) {
      await client.query(
        `insert into guardians (student_id, name, phone, phone_normalized, email, relationship, is_primary)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, g.name, g.phone, normalizePhone(g.phone), g.email, g.relationship, g.isPrimary],
      );
    }

    await client.query("commit");
    return toStudent(row, input.guardians);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/** India-only normalization matching src/lib/phone.ts's normalizeIndianPhone shape. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export type StudentList = {
  rows: Student[];
  counts: Record<StudentStatus, number>;
  total: number;
  nextCursor: string | null;
};

export async function listStudents(
  opts: { status?: StudentStatus; q?: string; cursor?: string; pageSize?: number } = {},
): Promise<StudentList> {
  const pool = getPool();
  const pageSize = opts.pageSize ?? PAGE_SIZE;

  const countsResult = await pool.query(
    `select status, count(*)::int as count from students group by status`,
  );
  const counts = Object.fromEntries(STUDENT_STATUSES.map((s) => [s, 0])) as Record<StudentStatus, number>;
  for (const r of countsResult.rows) counts[r.status as StudentStatus] = r.count;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conditions.push(`status = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q.toLowerCase()}%`);
    conditions.push(`(lower(first_name || ' ' || last_name) like $${params.length} or lower(admission_number) like $${params.length})`);
  }
  if (opts.cursor) {
    params.push(opts.cursor);
    conditions.push(`admission_number > $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  params.push(pageSize + 1);

  const result = await pool.query(
    `select * from students ${where} order by admission_number asc limit $${params.length}`,
    params,
  );
  const rows = result.rows.slice(0, pageSize);
  const guardiansByStudent = await guardiansFor(rows.map((r) => r.id));

  return {
    rows: rows.map((r) => toStudent(r, guardiansByStudent.get(r.id) ?? [])),
    counts,
    total,
    nextCursor: result.rows.length > pageSize ? rows[rows.length - 1].admission_number : null,
  };
}

async function guardiansFor(studentIds: string[]): Promise<Map<string, Guardian[]>> {
  if (studentIds.length === 0) return new Map();
  const result = await getPool().query(
    `select * from guardians where student_id = any($1) order by is_primary desc, name asc`,
    [studentIds],
  );
  const map = new Map<string, Guardian[]>();
  for (const r of result.rows) {
    const list = map.get(r.student_id) ?? [];
    list.push({ name: r.name, phone: r.phone, email: r.email, relationship: r.relationship, isPrimary: r.is_primary });
    map.set(r.student_id, list);
  }
  return map;
}

export async function getStudent(id: string): Promise<Student | null> {
  const pool = getPool();
  const result = await pool.query(`select * from students where id = $1`, [id]);
  if (result.rows.length === 0) return null;
  const guardians = (await guardiansFor([id])).get(id) ?? [];
  return toStudent(result.rows[0], guardians);
}

export async function listClassRoster(classSectionId: string): Promise<Student[]> {
  const pool = getPool();
  const result = await pool.query(
    `select * from students where class_section_id = $1 and status = 'enrolled' order by first_name, last_name limit 60`,
    [classSectionId],
  );
  const guardiansByStudent = await guardiansFor(result.rows.map((r) => r.id));
  return result.rows.map((r) => toStudent(r, guardiansByStudent.get(r.id) ?? []));
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/lib/db/queries/__tests__/students.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/students.ts src/lib/db/queries/__tests__/students.test.ts
git commit -m "feat: add students query layer with locked-counter admission numbers"
```

---

### Task 12: Query layer — leads

**Files:**
- Create: `src/lib/db/queries/leads.ts`
- Test: `src/lib/db/queries/__tests__/leads.test.ts`

**Interfaces:**
- Consumes: `getPool()` from Task 1.
- Produces: `createLead(input): Promise<Lead>`, `findDuplicateByPhone(phone): Promise<Lead | null>`, `addNote(leadId, note): Promise<void>`, `listNotes(leadId): Promise<LeadNote[]>`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/db/queries/__tests__/leads.test.ts
import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { getPool } from "../../client";
import { createLead, findDuplicateByPhone, addNote, listNotes } from "../leads";

afterAll(async () => {
  await getPool().end();
});

beforeEach(async () => {
  const pool = getPool();
  await pool.query("delete from lead_notes");
  await pool.query("delete from leads");
});

describe("createLead + findDuplicateByPhone", () => {
  it("creates a lead and finds it as a duplicate by phone", async () => {
    const lead = await createLead({
      type: "admission_inquiry",
      parentName: "Aisha Khan",
      phone: "+919886012345",
      childAgeBand: "eligible",
    });
    expect(lead.stage).toBe("new");

    const duplicate = await findDuplicateByPhone("+919886012345");
    expect(duplicate?.id).toBe(lead.id);
  });

  it("returns null when no lead matches the phone", async () => {
    const duplicate = await findDuplicateByPhone("+919999999999");
    expect(duplicate).toBeNull();
  });
});

describe("addNote + listNotes", () => {
  it("adds a note and atomically bumps note_count", async () => {
    const lead = await createLead({
      type: "admission_inquiry",
      parentName: "Priya Rao",
      phone: "+919886099999",
      childAgeBand: "eligible",
    });

    await addNote(lead.id, { text: "Called, no answer", author: "staff@alfitrah.in", kind: "note" });
    await addNote(lead.id, { text: "Moved to contacted", author: "staff@alfitrah.in", kind: "stage" });

    const notes = await listNotes(lead.id);
    expect(notes).toHaveLength(2);
    expect(notes[0].text).toBe("Moved to contacted"); // newest first

    const pool = getPool();
    const { rows } = await pool.query("select note_count from leads where id = $1", [lead.id]);
    expect(rows[0].note_count).toBe(2);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/lib/db/queries/__tests__/leads.test.ts`
Expected: FAIL — `Cannot find module '../leads'`

- [ ] **Step 3: Implement the query module**

```typescript
// src/lib/db/queries/leads.ts
import "server-only";
import { getPool } from "../client";

export type LeadType = "admission_inquiry" | "staff_application";

export type Lead = {
  id: string;
  type: LeadType;
  parentName: string;
  childName: string | null;
  phone: string;
  whatsapp: boolean;
  email: string | null;
  childAgeBand: string | null;
  stage: string;
  assignedTo: string | null;
  noteCount: number;
  possibleDuplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizePhoneKey(phone: string): string {
  return phone.replace(/[^\d]/g, "").replace(/^0+/, "");
}

function toLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    type: row.type as LeadType,
    parentName: String(row.parent_name),
    childName: row.child_name ? String(row.child_name) : null,
    phone: String(row.phone),
    whatsapp: Boolean(row.whatsapp),
    email: row.email ? String(row.email) : null,
    childAgeBand: row.child_age_band ? String(row.child_age_band) : null,
    stage: String(row.stage),
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    noteCount: Number(row.note_count),
    possibleDuplicateOf: row.possible_duplicate_of ? String(row.possible_duplicate_of) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export type CreateLeadInput = {
  type: LeadType;
  parentName: string;
  childName?: string;
  phone: string;
  whatsapp?: boolean;
  email?: string;
  childAgeBand?: string;
  message?: string;
  source?: string;
};

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const pool = getPool();
  const duplicate = await findDuplicateByPhone(input.phone);
  const result = await pool.query(
    `insert into leads
      (type, parent_name, child_name, phone, phone_key, whatsapp, email, child_age_band, message, source, possible_duplicate_of)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning *`,
    [
      input.type,
      input.parentName,
      input.childName ?? null,
      input.phone,
      normalizePhoneKey(input.phone),
      input.whatsapp ?? false,
      input.email ?? null,
      input.childAgeBand ?? null,
      input.message ?? null,
      input.source ?? null,
      duplicate?.id ?? null,
    ],
  );
  return toLead(result.rows[0]);
}

/** Most recent lead with the same phone number, if any. */
export async function findDuplicateByPhone(phone: string): Promise<Lead | null> {
  const pool = getPool();
  const result = await pool.query(
    `select * from leads where phone_key = $1 order by created_at desc limit 1`,
    [normalizePhoneKey(phone)],
  );
  return result.rows.length ? toLead(result.rows[0]) : null;
}

export type LeadNote = {
  id: string;
  text: string;
  author: string;
  kind: "note" | "stage";
  createdAt: string;
};

export type NoteInput = { text: string; author: string; kind: "note" | "stage" };

/**
 * Adds a note and bumps the lead's note_count in one transaction — both
 * halves must land together, same rule as queueNote() in
 * src/lib/notes.ts: a note without the counter bump makes the "untouched
 * lead" query wrong, and a bump without a note inflates a badge over
 * nothing a human can read.
 */
export async function addNote(leadId: string, note: NoteInput): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into lead_notes (lead_id, text, author, kind) values ($1, $2, $3, $4)`,
      [leadId, note.text, note.author, note.kind],
    );
    await client.query(
      `update leads set note_count = note_count + 1, updated_at = now() where id = $1`,
      [leadId],
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function listNotes(leadId: string): Promise<LeadNote[]> {
  const pool = getPool();
  const result = await pool.query(
    `select * from lead_notes where lead_id = $1 order by created_at desc limit 50`,
    [leadId],
  );
  return result.rows.map((r) => ({
    id: String(r.id),
    text: String(r.text),
    author: String(r.author),
    kind: r.kind as "note" | "stage",
    createdAt: String(r.created_at),
  }));
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/lib/db/queries/__tests__/leads.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/leads.ts src/lib/db/queries/__tests__/leads.test.ts
git commit -m "feat: add leads query layer with atomic note counter"
```

---

### Task 13: Query layer — fees (payment ledger + reconciliation)

**Files:**
- Create: `src/lib/db/queries/fees.ts`
- Test: `src/lib/db/queries/__tests__/fees.test.ts`

**Interfaces:**
- Consumes: `getPool()` from Task 1, `students` table from Task 6.
- Produces: `nextReceiptNumber(year): Promise<string>`, `recordPayment(input): Promise<Payment>`, `listPayments(studentId): Promise<Payment[]>`, `reconcile(studentId): Promise<{cachedPaise, ledgerPaise}>`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/db/queries/__tests__/fees.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getPool } from "../../client";
import { nextReceiptNumber, recordPayment, listPayments, reconcile } from "../fees";

let studentId: string;
let userId: string;

beforeAll(async () => {
  const pool = getPool();
  const year = await pool.query(
    `insert into academic_years (label, start_date, end_date) values ('2026-27', '2026-06-01', '2027-05-31') returning id`,
  );
  const role = await pool.query(`select id from roles where key = 'staff'`);
  const user = await pool.query(
    `insert into users (email, role_id) values ('staff@alfitrah.in', $1) returning id`,
    [role.rows[0].id],
  );
  userId = user.rows[0].id;
  const student = await pool.query(
    `insert into students (admission_number, first_name, last_name, academic_year_id, status)
     values ('AF-2026-0001', 'Zayn', 'Ahmed', $1, 'enrolled') returning id`,
    [year.rows[0].id],
  );
  studentId = student.rows[0].id;
});

afterAll(async () => {
  const pool = getPool();
  await pool.query("delete from payments");
  await pool.query("delete from students");
  await pool.query("delete from users");
  await pool.query("delete from academic_years");
  await pool.end();
});

beforeEach(async () => {
  await getPool().query("delete from payments");
});

describe("nextReceiptNumber", () => {
  it("starts at 0001 and increments", async () => {
    expect(await nextReceiptNumber(2026)).toBe("RCP-2026-0001");
    expect(await nextReceiptNumber(2026)).toBe("RCP-2026-0002");
  });
});

describe("recordPayment + reconcile", () => {
  it("sums payments correctly and reconciles against the ledger", async () => {
    await recordPayment({ studentId, amountPaise: 500000, method: "upi", recordedBy: userId });
    await recordPayment({ studentId, amountPaise: 300000, method: "cash", recordedBy: userId });
    // a correction: a refund is a new negative row, never an edit
    await recordPayment({ studentId, amountPaise: -50000, method: "cash", note: "partial refund", recordedBy: userId });

    const payments = await listPayments(studentId);
    expect(payments).toHaveLength(3);
    expect(payments[0].amountPaise).toBe(-50000); // newest first

    const { ledgerPaise } = await reconcile(studentId);
    expect(ledgerPaise).toBe(750000);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/lib/db/queries/__tests__/fees.test.ts`
Expected: FAIL — `Cannot find module '../fees'`

- [ ] **Step 3: Implement the query module**

```typescript
// src/lib/db/queries/fees.ts
import "server-only";
import { getPool } from "../client";

export type Payment = {
  id: string;
  receiptNumber: string;
  studentId: string;
  amountPaise: number;
  method: string;
  reference: string | null;
  note: string | null;
  receivedAt: string;
  recordedBy: string;
};

function toPayment(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    receiptNumber: String(row.receipt_number),
    studentId: String(row.student_id),
    amountPaise: Number(row.amount_paise),
    method: String(row.method),
    reference: row.reference ? String(row.reference) : null,
    note: row.note ? String(row.note) : null,
    receivedAt: String(row.received_at),
    recordedBy: String(row.recorded_by),
  };
}

/**
 * Next receipt number for a year, as "RCP-2026-0001".
 *
 * Same locked-counter approach as nextAdmissionNumber() in
 * src/lib/db/queries/students.ts — see that function's comment for why this
 * replaces the "scan for the highest existing value" pattern.
 */
export async function nextReceiptNumber(year: number): Promise<string> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const key = `receipt:${year}`;
    await client.query(
      `insert into id_sequences (key, last_value) values ($1, 0) on conflict (key) do nothing`,
      [key],
    );
    const result = await client.query(
      `update id_sequences set last_value = last_value + 1 where key = $1 returning last_value`,
      [key],
    );
    await client.query("commit");
    return `RCP-${year}-${String(result.rows[0].last_value).padStart(4, "0")}`;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export type RecordPaymentInput = {
  studentId: string;
  amountPaise: number;
  method?: string;
  reference?: string;
  note?: string;
  recordedBy: string;
};

/**
 * Records a payment (or, with a negative amountPaise, a correction) and
 * bumps the student's cached total in the same transaction — an increment,
 * not an overwrite, so two staff recording payments at the same moment both
 * land instead of one clobbering the other. The ledger row is what payments
 * actually IS; total_fees_paise on students is a cache reconcile() can
 * always recompute from it.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const year = new Date().getFullYear();
    const receiptNumber = await nextReceiptNumber(year);

    const result = await client.query(
      `insert into payments (receipt_number, student_id, amount_paise, method, reference, note, recorded_by)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        receiptNumber,
        input.studentId,
        input.amountPaise,
        input.method ?? "cash",
        input.reference ?? null,
        input.note ?? null,
        input.recordedBy,
      ],
    );
    await client.query(
      `update students set total_fees_paise = total_fees_paise + $1, updated_at = now() where id = $2`,
      [input.amountPaise, input.studentId],
    );
    await client.query("commit");
    return toPayment(result.rows[0]);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function listPayments(studentId: string): Promise<Payment[]> {
  const pool = getPool();
  const result = await pool.query(
    `select * from payments where student_id = $1 order by received_at desc limit 50`,
    [studentId],
  );
  return result.rows.map(toPayment);
}

/**
 * Recompute a student's paid total from the ledger via SUM — the
 * reconciliation path for the total_fees_paise cache, same role as
 * reconcile() in src/lib/fees.ts. A mismatch means something wrote outside
 * recordPayment(), which is worth surfacing, not silently correcting.
 */
export async function reconcile(studentId: string): Promise<{ cachedPaise: number; ledgerPaise: number }> {
  const pool = getPool();
  const [student, sum] = await Promise.all([
    pool.query(`select total_fees_paise from students where id = $1`, [studentId]),
    pool.query(`select coalesce(sum(amount_paise), 0)::bigint as total from payments where student_id = $1`, [studentId]),
  ]);
  return {
    cachedPaise: Number(student.rows[0].total_fees_paise),
    ledgerPaise: Number(sum.rows[0].total),
  };
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/lib/db/queries/__tests__/fees.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/fees.ts src/lib/db/queries/__tests__/fees.test.ts
git commit -m "feat: add fees query layer with append-only ledger and reconciliation"
```

---

### Task 14: Query layer — attendance

**Files:**
- Create: `src/lib/db/queries/attendance.ts`
- Test: `src/lib/db/queries/__tests__/attendance.test.ts`

**Interfaces:**
- Consumes: `getPool()` from Task 1, `students`/`class_sections`/`academic_years` from earlier tasks.
- Produces: `markAttendance(input): Promise<void>`, `getRegister(classSectionId, date): Promise<Register | null>`, `studentAttendanceSummary(studentId, from, to): Promise<{present, absent, counted, percent}>`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/db/queries/__tests__/attendance.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getPool } from "../../client";
import { markAttendance, getRegister, studentAttendanceSummary } from "../attendance";

let classSectionId: string;
let academicYearId: string;
let studentAId: string;
let studentBId: string;
let markerId: string;

beforeAll(async () => {
  const pool = getPool();
  const section = await pool.query(`insert into class_sections (name) values ('Rose') returning id`);
  classSectionId = section.rows[0].id;
  const year = await pool.query(
    `insert into academic_years (label, start_date, end_date) values ('2026-27', '2026-06-01', '2027-05-31') returning id`,
  );
  academicYearId = year.rows[0].id;
  const role = await pool.query(`select id from roles where key = 'staff'`);
  const user = await pool.query(`insert into users (email, role_id) values ('teacher@alfitrah.in', $1) returning id`, [role.rows[0].id]);
  markerId = user.rows[0].id;
  const a = await pool.query(
    `insert into students (admission_number, first_name, class_section_id, academic_year_id, status) values ('AF-2026-0001', 'A', $1, $2, 'enrolled') returning id`,
    [classSectionId, academicYearId],
  );
  studentAId = a.rows[0].id;
  const b = await pool.query(
    `insert into students (admission_number, first_name, class_section_id, academic_year_id, status) values ('AF-2026-0002', 'B', $1, $2, 'enrolled') returning id`,
    [classSectionId, academicYearId],
  );
  studentBId = b.rows[0].id;
});

afterAll(async () => {
  const pool = getPool();
  await pool.query("delete from attendance_records");
  await pool.query("delete from attendance_registers");
  await pool.query("delete from students");
  await pool.query("delete from users");
  await pool.query("delete from class_sections");
  await pool.query("delete from academic_years");
  await pool.end();
});

beforeEach(async () => {
  const pool = getPool();
  await pool.query("delete from attendance_records");
  await pool.query("delete from attendance_registers");
});

describe("markAttendance + getRegister", () => {
  it("marks a register and is idempotent on re-mark (upsert, not duplicate)", async () => {
    await markAttendance({
      classSectionId,
      academicYearId,
      date: "2026-08-18",
      markedBy: markerId,
      entries: { [studentAId]: "present", [studentBId]: "absent" },
    });
    // re-marking the same day overwrites, never duplicates
    await markAttendance({
      classSectionId,
      academicYearId,
      date: "2026-08-18",
      markedBy: markerId,
      entries: { [studentAId]: "present", [studentBId]: "late" },
    });

    const register = await getRegister(classSectionId, "2026-08-18");
    expect(register?.entries[studentBId]).toBe("late");

    const pool = getPool();
    const { rows } = await pool.query("select count(*)::int as count from attendance_registers");
    expect(rows[0].count).toBe(1); // still one register, not two
  });
});

describe("studentAttendanceSummary", () => {
  it("computes a percentage across a date range", async () => {
    await markAttendance({ classSectionId, academicYearId, date: "2026-08-17", markedBy: markerId, entries: { [studentAId]: "present" } });
    await markAttendance({ classSectionId, academicYearId, date: "2026-08-18", markedBy: markerId, entries: { [studentAId]: "absent" } });

    const summary = await studentAttendanceSummary(studentAId, "2026-08-01", "2026-08-31");
    expect(summary.present).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.percent).toBe(50);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/lib/db/queries/__tests__/attendance.test.ts`
Expected: FAIL — `Cannot find module '../attendance'`

- [ ] **Step 3: Implement the query module**

```typescript
// src/lib/db/queries/attendance.ts
import "server-only";
import { getPool } from "../client";

export type Register = {
  id: string;
  classSectionId: string;
  academicYearId: string;
  date: string;
  entries: Record<string, string>;
  markedBy: string | null;
  markedAt: string | null;
};

export type MarkAttendanceInput = {
  classSectionId: string;
  academicYearId: string;
  date: string;
  markedBy: string;
  entries: Record<string, string>;
};

/**
 * Marks (or re-marks) a class register for one day.
 *
 * One register row per (class_section, date) — the unique index from
 * migration 006 makes this an upsert, matching the derived-document-id
 * idempotency the Firestore version got from registerId(). Each student's
 * status is a row in attendance_records, replaced wholesale on re-mark
 * rather than diffed, since a register for one class on one day is at most
 * a few dozen rows — replacing all of them costs nothing extra and avoids
 * reasoning about partial updates.
 */
export async function markAttendance(input: MarkAttendanceInput): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const register = await client.query(
      `insert into attendance_registers (class_section_id, academic_year_id, date, marked_by, marked_at)
       values ($1, $2, $3, $4, now())
       on conflict (class_section_id, date)
       do update set marked_by = excluded.marked_by, marked_at = excluded.marked_at
       returning id`,
      [input.classSectionId, input.academicYearId, input.date, input.markedBy],
    );
    const registerId = register.rows[0].id;

    await client.query(`delete from attendance_records where register_id = $1`, [registerId]);
    for (const [studentId, status] of Object.entries(input.entries)) {
      await client.query(
        `insert into attendance_records (register_id, student_id, status) values ($1, $2, $3)`,
        [registerId, studentId, status],
      );
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function getRegister(classSectionId: string, date: string): Promise<Register | null> {
  const pool = getPool();
  const registerResult = await pool.query(
    `select * from attendance_registers where class_section_id = $1 and date = $2`,
    [classSectionId, date],
  );
  if (registerResult.rows.length === 0) return null;
  const r = registerResult.rows[0];

  const recordsResult = await pool.query(
    `select student_id, status from attendance_records where register_id = $1`,
    [r.id],
  );
  const entries = Object.fromEntries(recordsResult.rows.map((row) => [row.student_id, row.status]));

  return {
    id: String(r.id),
    classSectionId: String(r.class_section_id),
    academicYearId: String(r.academic_year_id),
    date: String(r.date),
    entries,
    markedBy: r.marked_by ? String(r.marked_by) : null,
    markedAt: r.marked_at ? String(r.marked_at) : null,
  };
}

export type AttendanceSummary = {
  present: number;
  absent: number;
  counted: number;
  percent: number | null;
};

/**
 * A student's attendance across a date range, computed with database-side
 * aggregation — a single indexed query on attendance_records via
 * student_id, not a scan across every register in the range. This is the
 * direct payoff of splitting registers from records in migration 006.
 */
export async function studentAttendanceSummary(
  studentId: string,
  fromDate: string,
  toDate: string,
): Promise<AttendanceSummary> {
  const pool = getPool();
  const result = await pool.query(
    `select ar.status
     from attendance_records ar
     join attendance_registers reg on reg.id = ar.register_id
     where ar.student_id = $1 and reg.date >= $2 and reg.date <= $3`,
    [studentId, fromDate, toDate],
  );
  let present = 0;
  let absent = 0;
  for (const row of result.rows) {
    if (row.status === "present" || row.status === "late") present += 1;
    else if (row.status === "absent") absent += 1;
  }
  const counted = present + absent;
  return { present, absent, counted, percent: counted === 0 ? null : Math.round((present / counted) * 100) };
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/lib/db/queries/__tests__/attendance.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/attendance.ts src/lib/db/queries/__tests__/attendance.test.ts
git commit -m "feat: add attendance query layer with database-side summary aggregation"
```

---

### Task 15: Query layer — audit log

**Files:**
- Create: `src/lib/db/queries/audit.ts`
- Test: `src/lib/db/queries/__tests__/audit.test.ts`

**Interfaces:**
- Consumes: `getPool()` from Task 1.
- Produces: `recordAudit(entry): Promise<void>`, `listAudit(opts): Promise<AuditPage>`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/db/queries/__tests__/audit.test.ts
import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { getPool } from "../../client";
import { recordAudit, listAudit } from "../audit";

afterAll(async () => {
  await getPool().end();
});

beforeEach(async () => {
  await getPool().query("delete from audit_log");
});

describe("recordAudit + listAudit", () => {
  it("records an entry and lists it back", async () => {
    await recordAudit({
      actor: "staff@alfitrah.in",
      action: "lead.stage_changed",
      entity: { type: "lead", id: "abc-123" },
      summary: "Moved to Contacted",
      meta: { from: "new", to: "contacted" },
    });

    const page = await listAudit({});
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0].action).toBe("lead.stage_changed");
    expect(page.entries[0].meta.from).toBe("new");
  });

  it("filters by entity", async () => {
    await recordAudit({ actor: "a@x.com", action: "x.y", entity: { type: "lead", id: "1" }, summary: "s" });
    await recordAudit({ actor: "a@x.com", action: "x.y", entity: { type: "student", id: "2" }, summary: "s" });

    const page = await listAudit({ entityType: "student", entityId: "2" });
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0].entity.id).toBe("2");
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/lib/db/queries/__tests__/audit.test.ts`
Expected: FAIL — `Cannot find module '../audit'`

- [ ] **Step 3: Implement the query module**

```typescript
// src/lib/db/queries/audit.ts
import "server-only";
import { getPool } from "../client";

export type AuditEntity = { type: string; id: string };
export type AuditInput = {
  actor: string;
  action: string;
  entity: AuditEntity;
  summary: string;
  meta?: Record<string, string | number | boolean | null>;
};
export type AuditEntry = AuditInput & { id: string; createdAt: string };

const RETENTION_DAYS = 730;

/** Append-only — no update/delete path, enforced at the database level by migration 008. */
export async function recordAudit(entry: AuditInput): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into audit_log (actor, action, entity_type, entity_id, summary, meta, expires_at)
     values ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval)`,
    [entry.actor, entry.action, entry.entity.type, entry.entity.id, entry.summary, entry.meta ?? {}, RETENTION_DAYS],
  );
}

export type AuditPage = { entries: AuditEntry[]; nextCursor: string | null };

export async function listAudit(
  opts: { actor?: string; entityType?: string; entityId?: string; cursor?: string } = {},
): Promise<AuditPage> {
  const pool = getPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts.actor) {
    params.push(opts.actor);
    conditions.push(`actor = $${params.length}`);
  }
  if (opts.entityType) {
    params.push(opts.entityType);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (opts.entityId) {
    params.push(opts.entityId);
    conditions.push(`entity_id = $${params.length}`);
  }
  if (opts.cursor) {
    params.push(opts.cursor);
    conditions.push(`created_at < $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  params.push(51);

  const result = await pool.query(
    `select * from audit_log ${where} order by created_at desc limit $${params.length}`,
    params,
  );
  const rows = result.rows.slice(0, 50);
  return {
    entries: rows.map((r) => ({
      id: String(r.id),
      actor: String(r.actor),
      action: String(r.action),
      entity: { type: String(r.entity_type), id: String(r.entity_id) },
      summary: String(r.summary),
      meta: r.meta,
      createdAt: String(r.created_at),
    })),
    nextCursor: result.rows.length > 50 ? String(rows[rows.length - 1].created_at) : null,
  };
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run src/lib/db/queries/__tests__/audit.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/audit.ts src/lib/db/queries/__tests__/audit.test.ts
git commit -m "feat: add audit log query layer"
```

---

### Task 16: Query layer — content (job openings + posts) and settings

**Files:**
- Create: `src/lib/db/queries/content.ts`
- Create: `src/lib/db/queries/settings.ts`
- Test: `src/lib/db/queries/__tests__/content.test.ts`
- Test: `src/lib/db/queries/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `listActiveOpenings()`, `listAllOpenings()`, `listPublishedPosts(type?)`, `getPostBySlug(slug)`, `getSettings()`, `updateSettings(data)`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/db/queries/__tests__/content.test.ts
import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { getPool } from "../../client";
import { listActiveOpenings, listAllOpenings, listPublishedPosts, getPostBySlug } from "../content";

afterAll(async () => {
  await getPool().end();
});

beforeEach(async () => {
  const pool = getPool();
  await pool.query("delete from job_openings");
  await pool.query("delete from posts");
});

describe("job openings", () => {
  it("lists only active openings for the public site", async () => {
    const pool = getPool();
    await pool.query(`insert into job_openings (title, active) values ('Teacher', true)`);
    await pool.query(`insert into job_openings (title, active) values ('Draft Role', false)`);

    const active = await listActiveOpenings();
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe("Teacher");

    const all = await listAllOpenings();
    expect(all).toHaveLength(2);
  });
});

describe("posts", () => {
  it("lists only published posts and fetches by slug", async () => {
    const pool = getPool();
    await pool.query(
      `insert into posts (type, title, slug, published, published_at) values ('news', 'Admissions Open', 'admissions-open', true, now())`,
    );
    await pool.query(`insert into posts (type, title, slug, published) values ('news', 'Draft', 'draft', false)`);

    const published = await listPublishedPosts();
    expect(published).toHaveLength(1);

    const post = await getPostBySlug("admissions-open");
    expect(post?.title).toBe("Admissions Open");

    const draft = await getPostBySlug("draft");
    expect(draft).toBeNull(); // unpublished posts don't resolve by slug publicly
  });
});
```

```typescript
// src/lib/db/queries/__tests__/settings.test.ts
import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { getPool } from "../../client";
import { getSettings, updateSettings } from "../settings";
import { DEFAULT_SETTINGS } from "@/lib/settings/schema";

afterAll(async () => {
  await getPool().end();
});

beforeEach(async () => {
  await getPool().query("delete from app_settings");
});

describe("getSettings", () => {
  it("returns the code default when no row exists yet", async () => {
    const settings = await getSettings();
    expect(settings.school.name).toBe(DEFAULT_SETTINGS.school.name);
  });

  it("returns the stored row once one is written", async () => {
    await updateSettings({ ...DEFAULT_SETTINGS, school: { ...DEFAULT_SETTINGS.school, name: "Custom Name" } });
    const settings = await getSettings();
    expect(settings.school.name).toBe("Custom Name");
  });
});
```

- [ ] **Step 2: Run them, confirm both fail**

Run: `npx vitest run src/lib/db/queries/__tests__/content.test.ts src/lib/db/queries/__tests__/settings.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement `content.ts`**

```typescript
// src/lib/db/queries/content.ts
import "server-only";
import { getPool } from "../client";

export type JobOpening = {
  id: string;
  title: string;
  employmentType: string;
  summary: string;
  requirements: string[];
  active: boolean;
  sortOrder: number;
};

function toOpening(row: Record<string, unknown>): JobOpening {
  return {
    id: String(row.id),
    title: String(row.title),
    employmentType: String(row.employment_type),
    summary: String(row.summary),
    requirements: (row.requirements as string[]) ?? [],
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
  };
}

export async function listActiveOpenings(): Promise<JobOpening[]> {
  const pool = getPool();
  const result = await pool.query(
    `select * from job_openings where active = true order by sort_order asc, created_at desc`,
  );
  return result.rows.map(toOpening);
}

export async function listAllOpenings(): Promise<JobOpening[]> {
  const pool = getPool();
  const result = await pool.query(`select * from job_openings order by sort_order asc, created_at desc`);
  return result.rows.map(toOpening);
}

export type Post = {
  id: string;
  type: "news" | "event";
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imageUrl: string | null;
  eventDate: string | null;
  published: boolean;
  publishedAt: string | null;
};

function toPost(row: Record<string, unknown>): Post {
  return {
    id: String(row.id),
    type: row.type as "news" | "event",
    title: String(row.title),
    slug: String(row.slug),
    excerpt: String(row.excerpt),
    body: String(row.body),
    imageUrl: row.image_url ? String(row.image_url) : null,
    eventDate: row.event_date ? String(row.event_date) : null,
    published: Boolean(row.published),
    publishedAt: row.published_at ? String(row.published_at) : null,
  };
}

export async function listPublishedPosts(type?: "news" | "event", limit = 12): Promise<Post[]> {
  const pool = getPool();
  const params: unknown[] = [];
  let where = "where published = true";
  if (type) {
    params.push(type);
    where += ` and type = $${params.length}`;
  }
  params.push(limit);
  const result = await pool.query(
    `select * from posts ${where} order by published_at desc limit $${params.length}`,
    params,
  );
  return result.rows.map(toPost);
}

/** Only resolves published posts — a draft slug returns null even to a direct lookup. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const pool = getPool();
  const result = await pool.query(`select * from posts where slug = $1 and published = true`, [slug]);
  return result.rows.length ? toPost(result.rows[0]) : null;
}
```

- [ ] **Step 4: Implement `settings.ts`**

```typescript
// src/lib/db/queries/settings.ts
import "server-only";
import { getPool } from "../client";
import { settingsSchema, DEFAULT_SETTINGS, type Settings } from "@/lib/settings/schema";

/**
 * Reads the single settings row, falling back to the code default when
 * nothing has been configured yet — same "code is the floor" rule as
 * src/lib/settings/index.ts. Validated through the existing Zod schema so a
 * corrupt or partial stored row degrades to the default instead of taking
 * the site down.
 */
export async function getSettings(): Promise<Settings> {
  const pool = getPool();
  const result = await pool.query(`select data from app_settings where id = 1`);
  if (result.rows.length === 0) return DEFAULT_SETTINGS;
  const parsed = settingsSchema.safeParse(result.rows[0].data);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function updateSettings(data: Settings): Promise<void> {
  const pool = getPool();
  const validated = settingsSchema.parse(data);
  await pool.query(
    `insert into app_settings (id, data, updated_at) values (1, $1, now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [validated],
  );
}
```

- [ ] **Step 5: Run both test files, confirm they pass**

Run: `npx vitest run src/lib/db/queries/__tests__/content.test.ts src/lib/db/queries/__tests__/settings.test.ts`
Expected: PASS (4 tests total)

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/queries/content.ts src/lib/db/queries/settings.ts src/lib/db/queries/__tests__/content.test.ts src/lib/db/queries/__tests__/settings.test.ts
git commit -m "feat: add content and settings query layers"
```

---

### Task 17: Local dev seed script + README

**Files:**
- Create: `scripts/db/seed.mjs`
- Create: `docs/db-local-dev.md`

**Interfaces:**
- Consumes: every migration from Tasks 3–10.
- Produces: `npm run db:seed` — populates a fresh local database with one academic year, the school's real programs/class sections (from the current `DEFAULT_SETTINGS.taxonomy` in `src/lib/settings/schema.ts`), and one owner user, so a developer can run the admin UI against Postgres once a later plan wires it up.

- [ ] **Step 1: Write the seed script**

```javascript
// scripts/db/seed.mjs
import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query("begin");

    await client.query(
      `insert into academic_years (label, start_date, end_date)
       values ('2026-27', '2026-06-01', '2027-05-31')
       on conflict (label) do nothing`,
    );

    // Matches DEFAULT_SETTINGS.taxonomy.programs / classSections in
    // src/lib/settings/schema.ts.
    for (const [i, name] of ["Pre-KG", "Junior KG", "Senior KG"].entries()) {
      await client.query(
        `insert into programs (name, sort_order) values ($1, $2) on conflict (name) do nothing`,
        [name, i],
      );
    }
    for (const [i, name] of ["Rose", "Tulip", "Jasmine", "Lily", "Iris", "Orchid"].entries()) {
      await client.query(
        `insert into class_sections (name, sort_order) values ($1, $2) on conflict (name) do nothing`,
        [name, i],
      );
    }

    const ownerRole = await client.query(`select id from roles where key = 'owner'`);
    await client.query(
      `insert into users (email, display_name, role_id) values ($1, 'Dev Owner', $2) on conflict (email) do nothing`,
      ["dev-owner@alfitrah.local", ownerRole.rows[0].id],
    );

    await client.query("commit");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Wire it into `package.json`**

Add to `scripts`:
```json
"db:seed": "node scripts/db/seed.mjs"
```

- [ ] **Step 3: Run it**

Run: `npm run db:migrate && npm run db:seed`
Expected: `Migrations up to date.` then `Seed complete.`

- [ ] **Step 4: Write the local-dev doc**

```markdown
<!-- docs/db-local-dev.md -->
# Postgres — local dev

New relational store, built alongside the existing Firebase app (not wired
into it yet — see docs/superpowers/plans/2026-08-18-postgres-foundation.md).

## Setup

    docker compose up -d postgres
    npm run db:migrate
    npm run db:seed

## Running the query-layer tests

    npx vitest run src/lib/db

Tests hit the real local Postgres — no mocking. `docker compose up -d
postgres` must be running first.

## Adding a migration

New file in `db/migrations/`, named `NNN_description.sql`, one more than the
highest existing number. Forward-only — no down migrations at this stage.
Run `npm run db:migrate` to apply.

## Resetting to a clean database

    docker compose down -v postgres
    docker compose up -d postgres
    npm run db:migrate
    npm run db:seed
```

- [ ] **Step 5: Commit**

```bash
git add scripts/db/seed.mjs docs/db-local-dev.md package.json
git commit -m "feat: add local dev seed script and setup docs"
```

---

## What this plan does not do

- Does not touch `src/app/**` or any existing `src/lib/firebase*.ts` file — the live app keeps running on Firebase exactly as it does today.
- Does not wire Cognito — `users.cognito_sub` exists as a column, unused. That's the next plan, once an AWS account and a real User Pool exist to point it at.
- Does not touch R2 or file uploads — `file_documents` is schema-only.
- Does not run against RDS — everything here targets local Docker Postgres. Pointing `DATABASE_URL` at RDS later is a config change, not a code change, provided the RDS instance is reachable and its network/security-group setup is done first (a Phase 13 task, blocked on AWS account creation).
