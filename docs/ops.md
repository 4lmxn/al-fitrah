# Operations runbook

Steps that need Firebase/GCP console or CLI access. Claude cannot run these —
they need your credentials. Ordered by how much you'd regret skipping them.

Project: `al-fitrah` · Region: `asia-south1` · Hosting: Firebase App Hosting

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
