import { z } from "zod";

/**
 * Platform configuration, as data rather than constants.
 *
 * Every module in the brief consumes at least one value that used to live in a
 * TypeScript constant. Making them editable after the modules are built would
 * mean rewriting the modules, so configuration becomes data first.
 *
 * Defaults live here, in code, deliberately:
 *  - the platform runs with an empty `settings/` collection, so nothing breaks
 *    before anyone configures anything;
 *  - a new setting ships with a working value instead of needing a migration;
 *  - a corrupt or partial stored document degrades to the default rather than
 *    taking the site down.
 *
 * The stored document is the source of truth where present. Code is the floor.
 */

const stage = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  // Which KPI column a stage rolls up into. Drives the inbox headline numbers.
  group: z.enum(["new", "active", "won", "lost"]),
  // Terminal stages are never chased: no follow-up, never "needs attention".
  terminal: z.boolean().default(false),
});
export type StageConfig = z.infer<typeof stage>;

const pipeline = z.object({
  label: z.string().min(1).max(60),
  stages: z.array(stage).min(2).max(20),
});

/** A named, ordered list — programs, class sections, lead sources, and so on. */
const taxonomy = z.array(z.string().min(1).max(60)).max(50);

export const settingsSchema = z.object({
  school: z.object({
    name: z.string().min(1).max(120),
    branch: z.string().max(80),
    tagline: z.string().max(200),
    phone: z.string().max(30),
    email: z.string().max(120),
    address: z.string().max(300),
    // DPDP requires a named contact. Empty means "not yet supplied"; the boot
    // check warns until it is filled in.
    grievanceOfficerName: z.string().max(120),
    grievanceOfficerEmail: z.string().max(120),
  }),

  academicYear: z.object({
    // Month the school year begins, 1-12. India is June, but this is a product
    // for schools, not for one school.
    startMonth: z.number().int().min(1).max(12),
  }),

  pipelines: z.object({
    admission_inquiry: pipeline,
    staff_application: pipeline,
  }),

  taxonomy: z.object({
    programs: taxonomy,
    classSections: taxonomy,
    leadSources: taxonomy,
    manualLeadSources: taxonomy,
    employmentTypes: taxonomy,
    paymentMethods: taxonomy,
  }),

  attendance: z.object({
    statuses: z.array(z.object({
      id: z.string().min(1).max(30),
      label: z.string().min(1).max(40),
      // Counts as attending for the percentage.
      present: z.boolean(),
      // Counted in the denominator at all. An authorised absence is neither.
      counted: z.boolean(),
    })).min(2).max(10),
    /** Weekday numbers that are not school days. 0 = Sunday. */
    nonSchoolDays: z.array(z.number().int().min(0).max(6)).max(7),
    /** Below this, the register flags a child. */
    lowAttendancePercent: z.number().int().min(0).max(100),
  }),

  features: z.object({
    comingSoon: z.boolean(),
    onlinePayments: z.boolean(),
    whatsappNotifications: z.boolean(),
    smsNotifications: z.boolean(),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;

/**
 * Shipping defaults — the values previously hardcoded across lib/.
 * Changing one here changes the behaviour of any school that has not overridden it.
 */
export const DEFAULT_SETTINGS: Settings = {
  school: {
    name: "Al Fitrah Pre School",
    branch: "Sarjapura",
    tagline: "Where young hearts and minds grow with faith.",
    phone: "+91 99865 00718",
    email: "alfitrah.sompura@gmail.com",
    address:
      "3rd Floor, Vivian Complex, Opp HP Petrol Bunk, Sompura Gate, Sarjapura, Bengaluru, Karnataka 562125",
    grievanceOfficerName: "",
    grievanceOfficerEmail: "alfitrah.sompura@gmail.com",
  },
  academicYear: { startMonth: 6 },
  pipelines: {
    admission_inquiry: {
      label: "Admission inquiry",
      stages: [
        { id: "new", label: "New", group: "new", terminal: false },
        { id: "contacted", label: "Contacted", group: "active", terminal: false },
        { id: "visited", label: "Visited", group: "active", terminal: false },
        { id: "applied", label: "Applied", group: "active", terminal: false },
        { id: "admitted", label: "Admitted", group: "won", terminal: true },
        { id: "lost", label: "Lost", group: "lost", terminal: true },
      ],
    },
    staff_application: {
      label: "Staff application",
      stages: [
        { id: "new", label: "New", group: "new", terminal: false },
        { id: "reviewing", label: "Reviewing", group: "active", terminal: false },
        { id: "interview", label: "Interview", group: "active", terminal: false },
        { id: "hired", label: "Hired", group: "won", terminal: true },
        { id: "rejected", label: "Rejected", group: "lost", terminal: true },
      ],
    },
  },
  taxonomy: {
    programs: ["Pre-KG", "Junior KG", "Senior KG"],
    classSections: ["Rose", "Tulip", "Jasmine", "Lily", "Iris", "Orchid"],
    leadSources: ["website", "waitlist", "prospectus", "walk-in", "phone", "referral", "whatsapp"],
    manualLeadSources: ["walk-in", "phone", "whatsapp", "referral"],
    employmentTypes: ["Full-time", "Part-time", "Contract", "Volunteer"],
    paymentMethods: ["cash", "upi", "bank transfer", "cheque", "card"],
  },
  attendance: {
    statuses: [
      { id: "present", label: "Present", present: true, counted: true },
      { id: "absent", label: "Absent", present: false, counted: true },
      { id: "late", label: "Late", present: true, counted: true },
      // Authorised: neither credits attendance nor counts against the child.
      { id: "excused", label: "Excused", present: false, counted: false },
    ],
    nonSchoolDays: [0],
    lowAttendancePercent: 75,
  },
  features: {
    comingSoon: true,
    onlinePayments: false,
    whatsappNotifications: false,
    smsNotifications: false,
  },
};
