import "server-only";
import { site } from "@/content/site";

// Boot-time environment validation. Called once from instrumentation.ts when a
// server instance starts. Logs grouped, actionable warnings instead of letting
// features fail silently at request time (e.g. admin login locking everyone out,
// inquiry emails never sending). Never throws — the site still boots so missing
// optional config doesn't take the whole app down.

type Check = { name: string; impact: string };

// One of these satisfies the Firebase Admin project id.
const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Critical: auth, admin dashboard, and Firestore reads/writes break without these.
const critical: Check[] = [
  { name: "FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID", impact: "Firebase Admin can't init — no Firestore or auth" },
  { name: "NEXT_PUBLIC_FIREBASE_API_KEY", impact: "client Firebase auth won't initialize" },
  { name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", impact: "admin sign-in popup can't load" },
  { name: "NEXT_PUBLIC_FIREBASE_APP_ID", impact: "client Firebase app won't register" },
  { name: "ADMIN_EMAILS", impact: "admin login authorizes NO ONE — dashboard locked" },
];

// Degraded: the site runs, but a specific feature silently no-ops.
const degraded: Check[] = [
  { name: "RESEND_API_KEY", impact: "inquiry & application emails won't send (leads still saved)" },
  { name: "INQUIRY_FROM_EMAIL", impact: "inquiry & application emails won't send (leads still saved)" },
  { name: "INQUIRY_ADMIN_EMAIL", impact: "inquiry & application emails won't send (leads still saved)" },
  { name: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", impact: "career CV uploads will fail" },
  { name: "CRON_SECRET", impact: "daily follow-up reminder digest is disabled (endpoint returns 401)" },
];

// Optional: sensible fallback exists; worth noting but harmless.
const optional: Check[] = [
  { name: "FIREBASE_SERVICE_ACCOUNT_KEY", impact: "falls back to Application Default Credentials (fine on Firebase App Hosting, required for local dev)" },
  { name: "NEXT_PUBLIC_SITE_URL", impact: "canonical URLs default to https://al-fitrah.web.app" },
  { name: "NEXT_PUBLIC_GA_ID", impact: "Google Analytics disabled" },
  { name: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", impact: "Search Console meta-tag verification unavailable (use DNS/file method instead)" },
  { name: "NEXT_PUBLIC_GEO_LAT", impact: "no geo coordinates in LocalBusiness schema — weaker Maps/local ranking" },
  { name: "NEXT_PUBLIC_GEO_LNG", impact: "no geo coordinates in LocalBusiness schema — weaker Maps/local ranking" },
];

// A var counts as set only if present and non-blank. The project-id row checks
// the resolved value rather than a single var name.
function missing({ name }: Check): boolean {
  if (name.startsWith("FIREBASE_PROJECT_ID")) return !PROJECT_ID;
  return !process.env[name]?.trim();
}

function format(checks: Check[]): string {
  return checks.map((c) => `    - ${c.name} — ${c.impact}`).join("\n");
}

// Not an env var, but the same class of problem: configured content that the
// site is legally worse off without, and which fails silently — the privacy
// page just quietly names the school instead of a person.
function checkGrievanceOfficer(): string | null {
  if (site.grievanceOfficer.name.trim()) return null;
  return (
    "  - site.grievanceOfficer.name is empty (src/content/site.ts)\n" +
    "    The DPDP Act requires a NAMED contact for data grievances. The privacy\n" +
    "    page currently falls back to the school's name, which is weaker than the\n" +
    "    Act asks for. Ask the school who owns this and fill in the one line."
  );
}

export function checkEnv(): void {
  const missingCritical = critical.filter(missing);
  const missingDegraded = degraded.filter(missing);
  const missingOptional = optional.filter(missing);

  const grievance = checkGrievanceOfficer();

  if (!missingCritical.length && !missingDegraded.length && !missingOptional.length && !grievance) {
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
  if (grievance) {
    console.warn(`\n[env] ⚠ COMPLIANCE — required before the site goes public:\n${grievance}\n`);
  }
  console.warn("[env] See .env.example for the full list and descriptions.\n");
}
