# Operations runbook

Steps that need Firebase/GCP console or CLI access. Most have now been applied —
see the status table below for what is done and what is still open. Kept as
runnable procedure so any of it can be re-applied, audited, or rebuilt.

Project: `al-fitrah` · Hosting: Firebase App Hosting

**Actual deployed locations** (verified 5 Aug 2026 — not what this doc originally assumed):

| Resource | Location |
|---|---|
| Firestore `(default)` | **`asia-south1`** — Mumbai (migrated 5 Aug 2026) |
| App Hosting backend | **`asia-east1`** — Taiwan |
| Cloud Storage (app) | `al-fitrah.firebasestorage.app` |
| Backups | `gs://al-fitrah-backups` — `asia-south1` (must match Firestore's continent) |

> ### Firestore was migrated out of the US on 5 Aug 2026
>
> It was created in `nam5` (North America). Every admin action crossed the
> Pacific, and children's data sat outside India. A database's location is fixed
> at creation, so the move meant deleting `(default)` and recreating it — done
> while the site was still gated and held four documents, which is the only
> cheap moment it will ever have.
>
> Recreated as `(default)` rather than a named database **on purpose**: the
> Firestore free tier applies only to `(default)`. A named database in the right
> region would have been simpler and would have lost 50k free reads/day.
>
> Verified by diffing a full pre- and post-migration dump: identical, including
> the notes subcollections and every timestamp.
>
> **Still outstanding:** the App Hosting backend is in `asia-east1` (Taiwan), so
> backend→Firestore is now Taiwan→Mumbai (~60ms) rather than Taiwan→Iowa
> (~180ms). Colocating the backend in `asia-south1` would take that to single
> digits, but a backend's region is also fixed at creation — it means a new
> backend and re-pointing the domain.
>
> The backup bucket was recreated in `asia-south1` at the same time — exports
> must target a bucket on the database's continent, so the weekly job would
> otherwise have started failing silently from the next Sunday.

---

## Status — what is already done

Applied and verified 5 Aug 2026. Nothing in this section needs re-running.

| Item | State |
|---|---|
| Firestore PITR | ✅ enabled, 7-day retention |
| Composite indexes | ✅ 12 deployed, all `READY` |
| Firestore rules | ✅ deployed (leads, students, attendance, payments all denied) |
| CV retention lifecycle | ✅ `applications/` deleted at 365 days — matches the privacy policy's promise |
| Backup bucket | ✅ `gs://al-fitrah-backups`, 90-day lifecycle |
| First Firestore export | ✅ `gs://al-fitrah-backups/2026-08-05/` |
| Audit log TTL | ✅ `expiresAt` TTL policy on `auditLog`, 2-year retention — enforced by Firestore, not a cron that can silently stop |
| Error alerting | ✅ log metric `app_errors` + policy "Al Fitrah — application errors" → owner email |
| Budget alert | ✅ ₹500/month, alerts at 50 / 90 / 100% |
| Weekly backup job | ✅ `.github/workflows/firestore-backup.yml` — **needs the `GCP_SA_KEY` repo secret** |
| Local service-account key | ✅ deleted; local dev now runs on `gcloud` user credentials |
| Notes backfill | ✅ **not needed** — verified no legacy `notes` arrays exist; `noteCount` already matches every subcollection |

### Still open

- **`GCP_SA_KEY` repo secret.** The weekly backup workflow is committed but fails until this exists — deliberately, because a backup you believe in but don't have is worse than none. The header of `.github/workflows/firestore-backup.yml` has the exact commands.
- **Grievance officer name.** **Settings → School** → "Grievance officer" and "Grievance email" (`settings.school.grievanceOfficerName`/`…Email`). No deploy, no code change. Only the school can supply the name; until it is set, the privacy page falls back to naming the school, and `/admin/settings` shows a standing DPDP banner. Draft message to send them is in §9.
- **`ADMIN_OWNERS` secret.** Declared in `apphosting.yaml`. An owner can also be named from **Staff → set a person to owner**, no deploy. The "everyone is an owner" fallback in `src/lib/roles.ts` fires only while the env list *and* the roster are both empty — it is the lockout guard, not the intended steady state.
- **Firestore location.** See the warning above.
- **Attendance rollup backfill.** Only if registers were saved before Sep 2026.
  `attendanceRollups` is written in the same batch as the register from that
  release onward, so anything marked since is already correct; earlier months
  have no rollup and the trend view shows them as "Not marked" — which is a lie
  about attendance that was actually taken. `node
  scripts/backfill-attendance-rollups.mjs` is a dry run and prints what it would
  write; `--commit` applies it. Safe to re-run: each day is written at its own
  key, so a second pass rewrites rather than adds. If the school marked its
  first register after this shipped, there is nothing to run.

---

## 1. Firestore Point-in-Time Recovery — do this before Phase 1

Phase 1 migrates every lead's `notes` array into a subcollection. PITR is the
undo button for that migration. Enabling it is a one-liner and it is free at
this data size (PITR bills on storage, and we are well under 1 GiB).

```bash
gcloud firestore databases update --database="(default)" --enable-pitr --project=al-fitrah
```

Verify:

```bash
gcloud firestore databases describe --database="(default)" --project=al-fitrah \
  --format="value(pointInTimeRecoveryEnablement)"
```

Expect `POINT_IN_TIME_RECOVERY_ENABLED`. Retention is 7 days.

## 2. Weekly Firestore export (off-site backup)

PITR covers 7 days. Exports cover everything older and survive a project-level
mistake. Managed exports bill as document reads, so a weekly export of a few
thousand leads costs a rounding error.

```bash
# One-time: a bucket for backups, separate from the app's Storage bucket.
# Must be on the same continent as the database. Firestore is asia-south1, so a
# US bucket is rejected outright with an INVALID_ARGUMENT.
gcloud storage buckets create gs://al-fitrah-backups --location=asia-south1 --project=al-fitrah

# Manual export — run once to confirm permissions before scheduling.
gcloud firestore export gs://al-fitrah-backups/$(date +%Y-%m-%d) \
  --database="(default)" --project=al-fitrah
```

Then schedule it weekly (Cloud Scheduler → Cloud Function, or a second GitHub
Actions cron alongside `.github/workflows/followup-cron.yml`).

Add a 90-day lifecycle rule on the backup bucket so old exports don't accrue
storage cost — see §4, same mechanism.

## 3. Error alerting

Right now every failure path is `console.error` into Cloud Logging with nobody
watching. The concrete scenario: the Resend API key expires, leads keep saving
correctly, admin notification emails silently stop, and you find out when the
school asks why nobody called a parent back.

Console → **Logging → Log-based Metrics → Create metric**

- Type: Counter
- Name: `app_errors`
- Filter:
  ```
  resource.type="cloud_run_revision"
  severity>=ERROR
  ```

Then **Monitoring → Alerting → Create policy** on `app_errors`, condition
"any time series > 0 for 5 minutes", notification channel = your email.

Worth a second alert on the follow-up cron *not* running: the GitHub Action
fails loudly, but only if you read the Actions tab.

## 4. Storage lifecycle rule for CVs — bounds the only unbounded cost

Cloud Storage gives 5 GiB free. CVs cap at 5 MB each, so ~1,000 CVs fills it
and every one after that bills. Applications are only useful while a role is
open, so expire them.

```bash
cat > /tmp/cv-lifecycle.json <<'JSON'
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": { "age": 365, "matchesPrefix": ["applications/"] }
      }
    ]
  }
}
JSON

gcloud storage buckets update gs://al-fitrah.firebasestorage.app \
  --lifecycle-file=/tmp/cv-lifecycle.json --project=al-fitrah
```

Verify:

```bash
gcloud storage buckets describe gs://al-fitrah.firebasestorage.app \
  --format="value(lifecycle)" --project=al-fitrah
```

> Tell the school this exists. "We keep CVs for 12 months" is also the retention
> line the privacy policy needs (Phase 3, DPDP).

## 5. Local dev credentials — drop the service-account key file

> **Done.** `scripts/drop-service-account-key.sh` performed this on 5 Aug 2026:
> it verified user credentials could read Firestore *before* removing anything,
> stripped the env line (keeping `.env.local.bak`), and deleted the key. Re-run
> it on any other machine that still has one. The rest of this section explains
> what it does.

`.env.local` currently sets `GOOGLE_APPLICATION_CREDENTIALS` to
`serviceAccountKey.json` in the repo root. It is correctly gitignored and is
**not** in git history (verified), but it is a long-lived, full-project-admin
credential sitting in a directory you routinely copy, archive, and back up.

User credentials give the same local access with nothing on disk to leak:

```bash
gcloud auth application-default login
```

Then remove the line from `.env.local` and delete the file:

```bash
rm serviceAccountKey.json
```

Do these in that order and restart `npm run dev` — `applicationDefault()` picks
up the user credentials automatically, so no code changes.

> Not done automatically: deleting the key while `GOOGLE_APPLICATION_CREDENTIALS`
> still points at it breaks local dev instantly.

## 6. Deploy the Firestore indexes

`firestore.indexes.json` is now in version control. Indexes must exist *before*
the queries that need them ship, and large index builds take minutes.

```bash
firebase deploy --only firestore:indexes --project=al-fitrah
```

Check build status:

```bash
gcloud firestore indexes composite list --database="(default)" --project=al-fitrah
```

Wait for all to read `READY` before merging Phase 1.

## 7. Secrets checklist (App Hosting)

Deploy fails on a missing secret reference, so create these before deploying:

```bash
firebase apphosting:secrets:set ADMIN_EMAILS   --project=al-fitrah
firebase apphosting:secrets:set RESEND_API_KEY --project=al-fitrah
firebase apphosting:secrets:set CRON_SECRET    --project=al-fitrah
```

`CRON_SECRET` must match the `CRON_SECRET` repo secret used by
`.github/workflows/followup-cron.yml`, and the repo needs an `APP_URL`
variable set to the site origin.

## 8. Going live — flipping the holding page off

`apphosting.yaml` sets `NEXT_PUBLIC_COMING_SOON: "1"`. While it is `"1"`:

- every public path serves the holding page (HTTP 200, not a redirect)
- `robots.txt` allows only `/`
- `sitemap.xml` lists only `/`

To launch: set it to `"0"`, redeploy, then in Search Console resubmit
`sitemap.xml` so the full route list gets crawled.

## 9. Cost monitoring

The design target is to stay inside the Blaze free tier — 50k Firestore
reads/day, 20k writes/day. See `docs/IMPLEMENTATION_PLAN.md` §1 for the budget
and the invariants that keep us there.

Set a budget alert as a backstop, not as the primary control:

Console → **Billing → Budgets & alerts → Create budget** — amount ₹500,
alert at 50% / 90% / 100%. Hitting 50% means an invariant broke; find which
query started scanning before paying the bill.

Usage lives at **Firebase Console → Firestore → Usage**, which breaks down
reads by day. Check it after Phase 1 ships to confirm the numbers.

## 9. Grievance officer — the one thing only the school can answer

`settings.school.grievanceOfficerName` is empty. The privacy page falls back to
naming the school (`src/app/(site)/privacy/page.tsx:179`), which is weaker than
the DPDP Act asks for: it wants a **named person** a parent can contact about
their data. `/admin/settings` carries a standing banner saying so until it is
filled in.

Nobody here can invent this. Message to send the school:

> As part of the new website's privacy policy, Indian data protection law
> (the DPDP Act, 2023) requires us to name one person parents can contact about
> their personal information — to see it, correct it, delete it, or complain.
>
> Could you confirm:
> 1. The name of the person who should handle these (usually the principal or
>    an administrator).
> 2. The email address parents should use — the school inbox is fine.
>
> It appears on the privacy page and we should respond within 30 days.

Once they reply, type it into **Settings → School**: "Grievance officer" and
"Grievance email", then Save. The banner disappears and the privacy page names
them instead of the school. No deploy — it is stored settings, not code.

## 10. Campus geofence — a two-step activation, on purpose

Staff check-in and the class register are both guarded by a distance check
against a campus pin. It ships in **advisory** mode: every check-in records how
far away it was, and nobody is refused.

That is not timidity, it is the only safe order. The pin in
`DEFAULT_SETTINGS` is an approximate reading for Sompura Gate. Enforcing against
a pin that is 300 m out locks every teacher out of the register on day one, from
a screen that offers them no way to fix it. So:

1. **Week one — measure.** Leave enforcement off. Staff check in as normal. The
   card on `/admin/attendance` reports the distance for every check-in, and so
   does the audit log.
2. **Correct the pin.** Stand at the campus, check in, read the distance. If it
   says 180 m, the pin is wrong, not the teacher. Copy the real coordinates
   (right-click the campus in Google Maps → click the lat,lng to copy) into
   **Settings → Operations → Campus location**. Repeat until a check-in from the
   gate reads near zero.
3. **Widen the radius before enforcing, not after.** 150 m is the default. A
   school occupying one floor of one building can go tighter; anywhere with a
   playground or a car park should go wider. Too tight is indistinguishable from
   a broken feature.
4. **Then tick "Block attendance marked away from campus".** From that point a
   check-in or a register save from off-campus is refused, and the attempt is
   written to the audit log with its coordinates.

The settings form refuses to enable enforcement while the pin is still `0,0`,
which is the one configuration guaranteed to lock everyone out.

### What it actually defends against

Worth being straight with the school about this, because it is sold as a
headline feature:

- **Stops** a teacher opening the register at home and marking themselves in.
  The browser reports a real position, the server refuses it, and the attempt is
  on the record with coordinates.
- **Does not stop** someone who opens developer tools and overrides the
  geolocation sensor, or runs a browser with a mocked location. Browser
  geolocation is supplied by the client and no amount of server-side work
  changes that.

It is a real control against casual abuse, and it leaves evidence either way. It
is not proof of presence. If it ever needs to be, the next step is a native app
reading the campus wifi BSSID, or a rotating code posted in the staff room —
both of which move the secret off the client.

### Requires HTTPS

`navigator.geolocation` is refused on an insecure origin. The feature works on
`localhost` and on the live HTTPS site, and will silently fail to get a position
on any plain-HTTP hostname — which, in advisory mode, looks like everything
working with no distances recorded.
