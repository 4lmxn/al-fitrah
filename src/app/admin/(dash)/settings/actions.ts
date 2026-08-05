"use server";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { saveSettings, type StageConfig } from "@/lib/settings";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/** Settings change platform behaviour for everyone. Owners only. */
async function requireOwnerForSettings() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return null;
  return admin;
}

/** A textarea of one-per-line values becomes a list, blank lines dropped. */
function lines(v: FormDataEntryValue | null, max = 50): string[] {
  return String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function saveSchool(formData: FormData): Promise<ActionResult> {
  return attempt("saveSchool", async () => {
    if (!(await requireOwnerForSettings())) return fail("Changing settings needs an owner account.");
    const res = await saveSettings({
      school: {
        name: clean(formData.get("name"), 120),
        branch: clean(formData.get("branch"), 80),
        tagline: clean(formData.get("tagline"), 200),
        phone: clean(formData.get("phone"), 30),
        email: clean(formData.get("email"), 120),
        // Structured so the LocalBusiness JSON-LD can emit a real PostalAddress.
        address: {
          street: clean(formData.get("street"), 160),
          locality: clean(formData.get("locality"), 120),
          city: clean(formData.get("city"), 80),
          region: clean(formData.get("region"), 80),
          postalCode: clean(formData.get("postalCode"), 20),
          country: clean(formData.get("country"), 2).toUpperCase(),
        },
        grievanceOfficerName: clean(formData.get("grievanceOfficerName"), 120),
        grievanceOfficerEmail: clean(formData.get("grievanceOfficerEmail"), 120),
      },
    });
    return res.ok ? { ok: true as const } : fail(res.error);
  });
}

export async function saveTaxonomy(formData: FormData): Promise<ActionResult> {
  return attempt("saveTaxonomy", async () => {
    if (!(await requireOwnerForSettings())) return fail("Changing settings needs an owner account.");
    const res = await saveSettings({
      taxonomy: {
        programs: lines(formData.get("programs")),
        classSections: lines(formData.get("classSections")),
        leadSources: lines(formData.get("leadSources")),
        manualLeadSources: lines(formData.get("manualLeadSources")),
        employmentTypes: lines(formData.get("employmentTypes")),
        paymentMethods: lines(formData.get("paymentMethods")),
      },
    });
    return res.ok ? { ok: true as const } : fail(res.error);
  });
}

export async function saveOperations(formData: FormData): Promise<ActionResult> {
  return attempt("saveOperations", async () => {
    if (!(await requireOwnerForSettings())) return fail("Changing settings needs an owner account.");
    const startMonth = Number(formData.get("startMonth"));
    if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
      return fail("Pick a month for the academic year to start.");
    }
    const low = Number(formData.get("lowAttendancePercent"));
    if (!Number.isInteger(low) || low < 0 || low > 100) return fail("Low-attendance threshold must be 0–100.");

    const res = await saveSettings({
      academicYear: { startMonth },
      attendance: {
        lowAttendancePercent: low,
        // Checkbox per weekday; unchecked days simply aren't submitted.
        nonSchoolDays: [0, 1, 2, 3, 4, 5, 6].filter((d) => formData.get(`nonSchoolDay-${d}`) === "on"),
      },
      features: {
        // comingSoon is NOT editable here. proxy.ts runs on every request in a
        // runtime that cannot read Firestore, so the gate must stay an env var;
        // a second copy here could disagree with the one actually in force.
        comingSoon: (await import("@/lib/flags")).COMING_SOON,
        onlinePayments: formData.get("onlinePayments") === "on",
        whatsappNotifications: formData.get("whatsappNotifications") === "on",
        smsNotifications: formData.get("smsNotifications") === "on",
      },
    });
    return res.ok ? { ok: true as const } : fail(res.error);
  });
}

/**
 * Save a pipeline's stages.
 *
 * Stage ids are submitted as hidden fields and never derived from the label on
 * save. A lead stores its stage by id, so re-deriving would silently orphan
 * every lead on a stage whose label was edited — the lead would point at a
 * stage that no longer exists and drop out of its own pipeline. Renaming is
 * therefore safe; only adding and removing change the id set.
 */
export async function savePipeline(formData: FormData): Promise<ActionResult> {
  return attempt("savePipeline", async () => {
    if (!(await requireOwnerForSettings())) return fail("Changing settings needs an owner account.");

    const type = clean(formData.get("type"), 40);
    if (type !== "admission_inquiry" && type !== "staff_application") return fail("Unknown pipeline.");

    const ids = formData.getAll("stageId").map((v) => clean(v, 40));
    const labels = formData.getAll("stageLabel").map((v) => clean(v, 60));
    const groups = formData.getAll("stageGroup").map((v) => clean(v, 20));
    const terminals = formData.getAll("stageTerminal").map((v) => clean(v, 10));

    const stages: StageConfig[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i] || !labels[i]) continue;
      if (seen.has(ids[i])) return fail(`Two stages share the id "${ids[i]}".`);
      seen.add(ids[i]);
      stages.push({
        id: ids[i],
        label: labels[i],
        group: (["new", "active", "won", "lost"].includes(groups[i]) ? groups[i] : "active") as StageConfig["group"],
        terminal: terminals[i] === "true",
      });
    }

    if (stages.length < 2) return fail("A pipeline needs at least two stages.");
    if (!stages.some((s) => s.group === "won")) {
      // Without a won stage the KPI row has no "Admitted" column and the funnel
      // has no end — a pipeline nobody can succeed in.
      return fail("A pipeline needs at least one stage in the Won group.");
    }

    const label = clean(formData.get("label"), 60) || (type === "admission_inquiry" ? "Admission inquiry" : "Staff application");
    const res = await saveSettings({ pipelines: { [type]: { label, stages } } });
    return res.ok ? { ok: true as const } : fail(res.error);
  });
}
