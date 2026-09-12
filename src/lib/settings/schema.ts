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
    // Structured, not one string: JSON-LD needs a PostalAddress, and a single
    // line cannot produce one. The display line is derived from these parts.
    address: z.object({
      street: z.string().max(160),
      locality: z.string().max(120),
      city: z.string().max(80),
      region: z.string().max(80),
      postalCode: z.string().max(20),
      country: z.string().max(2),
    }),
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
    leadTags: taxonomy,
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
    /**
     * The campus, for staff check-in.
     *
     * Configuration rather than env because the pin is something the office
     * corrects by standing at the gate and reading the distance off a check-in —
     * that should not need a deploy.
     *
     * `enforce` ships OFF on purpose. A guessed pin with enforcement on locks
     * every teacher out of the register on day one, and the school has no way
     * to fix it without a developer. With it off, check-ins still record their
     * distance from the pin, so the office can watch a week of real numbers,
     * correct the pin, and only then turn the block on. One toggle, no deploy.
     */
    campus: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      /** How far from the pin still counts as "at school". */
      radiusM: z.number().int().min(20).max(5_000),
      /** A fix vaguer than this is treated as no answer at all. */
      maxAccuracyM: z.number().int().min(20).max(2_000),
      /** Off: record the distance but never refuse. On: refuse off-campus. */
      enforce: z.boolean(),
    }),
  }),

  notifications: z.object({
    /** Which channels fire for each event. Empty means the event is silent. */
    events: z.object({
      "lead.created": z.array(z.enum(["email", "dashboard", "whatsapp", "sms"])).max(4),
      "application.received": z.array(z.enum(["email", "dashboard", "whatsapp", "sms"])).max(4),
      "followup.due": z.array(z.enum(["email", "dashboard", "whatsapp", "sms"])).max(4),
      "lead.assigned": z.array(z.enum(["email", "dashboard", "whatsapp", "sms"])).max(4),
    }),
    /** Editable copy. `{{token}}` placeholders are filled from the event payload. */
    templates: z.object({
      "lead.created": z.object({ subject: z.string().max(200), body: z.string().max(4000) }),
      "application.received": z.object({ subject: z.string().max(200), body: z.string().max(4000) }),
      "followup.due": z.object({ subject: z.string().max(200), body: z.string().max(4000) }),
      "lead.assigned": z.object({ subject: z.string().max(200), body: z.string().max(4000) }),
    }),
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
    address: {
      street: "3rd Floor, Vivian Complex, Opp HP Petrol Bunk",
      locality: "Sompura Gate, Sarjapura",
      city: "Bengaluru",
      region: "Karnataka",
      postalCode: "562125",
      country: "IN",
    },
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
    // Real: the three levels are described across the public site — one entry
    // point at Pre-KG, no lateral entry. Confirmed by the school, not assumed.
    programs: ["Pre-KG", "Junior KG", "Senior KG"],
    // Deliberately EMPTY. This used to ship six invented section names —
    // Rose, Tulip, Jasmine, Lily, Iris, Orchid — which appear nowhere in the
    // school's own content and were never asked for in
    // docs/school-facts-needed.md. With no settings document saved, those
    // defaults were what the console actually displayed: the attendance
    // register opened on "Rose", a class that does not exist, and the student
    // form offered five more.
    //
    // src/content/facts.ts states the rule the public site is held to — it
    // "can never show a placeholder, a TBD, or an invented number". The admin
    // console was not held to it. It is now: with no sections configured, the
    // screens that need them say so and link to Settings.
    classSections: [],
    leadSources: ["website", "waitlist", "prospectus", "walk-in", "phone", "referral", "whatsapp"],
    manualLeadSources: ["walk-in", "phone", "whatsapp", "referral"],
    employmentTypes: ["Full-time", "Part-time", "Contract", "Volunteer"],
    paymentMethods: ["cash", "upi", "bank transfer", "cheque", "card"],
    // A fixed vocabulary rather than free text. Typed freely, "Sibling",
    // "sibling" and "Sibling " are three tags, and a filter on any one of them
    // quietly misses most of the leads it should match.
    leadTags: ["Sibling", "Referred", "Priority", "Financial aid", "Relocating", "Revisit later"],
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
    campus: {
      // Sompura Gate, Sarjapura — approximate, and approximate is exactly why
      // `enforce` is false. Stand at the campus, check in, read the distance
      // the card reports, correct these two numbers, then turn enforce on.
      lat: 12.8797,
      lng: 77.7712,
      radiusM: 150,
      maxAccuracyM: 250,
      enforce: false,
    },
  },
  notifications: {
    events: {
      "lead.created": ["email", "dashboard"],
      "application.received": ["email", "dashboard"],
      "followup.due": ["email"],
      // Dashboard only: an assignment is an in-console event, and emailing every
      // reassignment is how a team learns to filter the sender.
      "lead.assigned": ["dashboard"],
    },
    templates: {
      "lead.created": {
        subject: "New admission enquiry — {{parentName}}",
        body: [
          "New enquiry from the website.",
          "",
          "Parent:  {{parentName}}",
          "Child:   {{childName}}",
          "Phone:   {{phone}}",
          "Email:   {{email}}",
          "Age:     {{childAge}}",
          "Program: {{programInterest}}",
          "Message: {{message}}",
          "",
          "Open it: {{link}}",
        ].join("\n"),
      },
      "application.received": {
        subject: "New staff application — {{name}} ({{role}})",
        body: [
          "New staff application from the website.",
          "",
          "Name:  {{name}}",
          "Phone: {{phone}}",
          "Email: {{email}}",
          "Role:  {{role}}",
          "",
          "CV and details: {{link}}",
        ].join("\n"),
      },
      "followup.due": {
        subject: "{{count}} lead(s) need follow-up today",
        body: ["Follow-up reminder.", "", "{{list}}", "", "Open the console: {{link}}"].join("\n"),
      },
      "lead.assigned": {
        subject: "{{parentName}} assigned to {{assignee}}",
        body: ["{{assignedBy}} assigned this enquiry to {{assignee}}.", "", "Open it: {{link}}"].join("\n"),
      },
    },
  },

  features: {
    comingSoon: true,
    onlinePayments: false,
    whatsappNotifications: false,
    smsNotifications: false,
  },
};

/** One-line address for display, derived from the structured parts. */
export function addressLine(a: Settings["school"]["address"]): string {
  return [a.street, a.locality, a.city, `${a.region} ${a.postalCode}`.trim()].filter(Boolean).join(", ");
}

/** Brand as used in titles and structured data: "Name, Branch". */
export function brandName(school: Settings["school"]): string {
  return school.branch ? `${school.name}, ${school.branch}` : school.name;
}
