import { z } from "zod";

const stage = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  group: z.enum(["new", "active", "won", "lost"]),
  terminal: z.boolean().default(false),
});
export type StageConfig = z.infer<typeof stage>;

const pipeline = z.object({
  label: z.string().min(1).max(60),
  stages: z.array(stage).min(2).max(20),
});

const taxonomy = z.array(z.string().min(1).max(60)).max(50);

export const settingsSchema = z.object({
  school: z.object({
    name: z.string().min(1).max(120),
    branch: z.string().max(80),
    tagline: z.string().max(200),
    phone: z.string().max(30),
    email: z.string().max(120),
    address: z.object({
      street: z.string().max(160),
      locality: z.string().max(120),
      city: z.string().max(80),
      region: z.string().max(80),
      postalCode: z.string().max(20),
      country: z.string().max(2),
    }),
    grievanceOfficerName: z.string().max(120),
    grievanceOfficerEmail: z.string().max(120),
  }),

  academicYear: z.object({
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
      present: z.boolean(),
      counted: z.boolean(),
    })).min(2).max(10),
    nonSchoolDays: z.array(z.number().int().min(0).max(6)).max(7),
    lowAttendancePercent: z.number().int().min(0).max(100),
    campus: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radiusM: z.number().int().min(20).max(5_000),
      maxAccuracyM: z.number().int().min(20).max(2_000),
      enforce: z.boolean(),
    }),
  }),

  notifications: z.object({
    events: z.object({
      "lead.created": z.array(z.enum(["email", "dashboard", "whatsapp", "sms"])).max(4),
      "application.received": z.array(z.enum(["email", "dashboard", "whatsapp", "sms"])).max(4),
      "followup.due": z.array(z.enum(["email", "dashboard", "whatsapp", "sms"])).max(4),
    }),
    templates: z.object({
      "lead.created": z.object({ subject: z.string().max(200), body: z.string().max(4000) }),
      "application.received": z.object({ subject: z.string().max(200), body: z.string().max(4000) }),
      "followup.due": z.object({ subject: z.string().max(200), body: z.string().max(4000) }),
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
    programs: ["Pre-KG", "Junior KG", "Senior KG"],
    classSections: [],
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
      { id: "excused", label: "Excused", present: false, counted: false },
    ],
    nonSchoolDays: [0],
    lowAttendancePercent: 75,
    campus: {
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
    },
  },

  features: {
    comingSoon: true,
    onlinePayments: false,
    whatsappNotifications: false,
    smsNotifications: false,
  },
};

export function addressLine(a: Settings["school"]["address"]): string {
  return [a.street, a.locality, a.city, `${a.region} ${a.postalCode}`.trim()].filter(Boolean).join(", ");
}

export function brandName(school: Settings["school"]): string {
  return school.branch ? `${school.name}, ${school.branch}` : school.name;
}
