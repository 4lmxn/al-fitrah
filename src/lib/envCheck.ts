import "server-only";

type Check = { name: string; impact: string };

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const critical: Check[] = [
  { name: "FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID", impact: "Firebase Admin can't init — no Firestore or auth" },
  { name: "NEXT_PUBLIC_FIREBASE_API_KEY", impact: "client Firebase auth won't initialize" },
  { name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", impact: "admin sign-in popup can't load" },
  { name: "NEXT_PUBLIC_FIREBASE_APP_ID", impact: "client Firebase app won't register" },
  { name: "ADMIN_EMAILS", impact: "admin login authorizes NO ONE — dashboard locked" },
];

const degraded: Check[] = [
  { name: "RESEND_API_KEY", impact: "inquiry & application emails won't send (leads still saved)" },
  { name: "INQUIRY_FROM_EMAIL", impact: "inquiry & application emails won't send (leads still saved)" },
  { name: "INQUIRY_ADMIN_EMAIL", impact: "inquiry & application emails won't send (leads still saved)" },
  { name: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", impact: "career CV uploads will fail" },
  { name: "CRON_SECRET", impact: "daily follow-up reminder digest is disabled (endpoint returns 401)" },
];

const optional: Check[] = [
  { name: "FIREBASE_SERVICE_ACCOUNT_KEY", impact: "falls back to Application Default Credentials (fine on Firebase App Hosting, required for local dev)" },
  { name: "NEXT_PUBLIC_SITE_URL", impact: "canonical URLs default to https://al-fitrah.web.app" },
  { name: "NEXT_PUBLIC_GA_ID", impact: "Google Analytics disabled" },
  { name: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", impact: "Search Console meta-tag verification unavailable (use DNS/file method instead)" },
  { name: "NEXT_PUBLIC_GEO_LAT", impact: "no geo coordinates in LocalBusiness schema — weaker Maps/local ranking" },
  { name: "NEXT_PUBLIC_GEO_LNG", impact: "no geo coordinates in LocalBusiness schema — weaker Maps/local ranking" },
];

function missing({ name }: Check): boolean {
  if (name.startsWith("FIREBASE_PROJECT_ID")) return !PROJECT_ID;
  return !process.env[name]?.trim();
}

function format(checks: Check[]): string {
  return checks.map((c) => `    - ${c.name} — ${c.impact}`).join("\n");
}

export function checkEnv(): void {
  const missingCritical = critical.filter(missing);
  const missingDegraded = degraded.filter(missing);
  const missingOptional = optional.filter(missing);

  if (!missingCritical.length && !missingDegraded.length && !missingOptional.length) {
    console.log("[env] All required and optional environment variables are set.");
    return;
  }

  if (missingCritical.length) {
    console.error(
      `\n[env] ✗ CRITICAL — these MUST be set or core features break:\n${format(missingCritical)}\n`,
    );
  }
  if (missingDegraded.length) {
    console.warn(
      `\n[env] ⚠ DEGRADED — site boots, but these features won't work:\n${format(missingDegraded)}\n`,
    );
  }
  if (missingOptional.length) {
    console.warn(
      `[env] ℹ Optional (using fallbacks):\n${format(missingOptional)}\n`,
    );
  }
  console.warn("[env] See .env.example for the full list and descriptions.\n");
}
