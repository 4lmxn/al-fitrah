# Admin / Leads — setup & manual test

## One-time Firebase console setup
1. **Auth → Sign-in method:** enable the **Google** provider.
2. **Auth → Settings → Authorized domains:** add
   `al-fitrah--al-fitrah.asia-east1.hosted.app` and `localhost`.
3. **Storage:** enable Cloud Storage (creates the default bucket
   `al-fitrah.firebasestorage.app`).

## Secrets
- Create the production allowlist secret:
  `firebase apphosting:secrets:set ADMIN_EMAILS`
  (value: comma-separated admin emails).
- Local: add `ADMIN_EMAILS=...` to `.env.local`.

## Deploy rules
- `firebase deploy --only firestore:rules,storage`

## Manual test (Google popup can't run in CI)
1. Visit `/admin` → redirected to `/admin/login`.
2. Sign in with an allowlisted Google account → reach the inbox.
3. Sign in with a NON-allowlisted account → blocked with a clear message.
4. Submit the Careers form with a PDF CV → appears under Staff applications.
5. Open the staff lead → change stage, add a note, download the CV.
6. Submit the site inquiry form → appears under Admission inquiries.
7. Sign out → `/admin` redirects to login again.
