import { z } from "zod";
import { PROGRAM_INTERESTS } from "@/lib/leads";

// Entry is only at Pre-KG for children aged 2y10m–3y10m, so the inquiry
// captures eligibility rather than a tier.
export const AGE_BANDS = ["below", "eligible", "above"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const leadSchema = z.object({
  parentName: z.string().trim().min(2, "Please enter a name").max(80),
  childName: optionalText(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone may only contain digits and + - ( )"),
  // Checkbox — the number is reachable on WhatsApp. Serialised as "on" by the
  // browser; coerced to a boolean so staff can one-tap message the right leads.
  whatsapp: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).optional(),
  email: z.string().trim().email("Please enter a valid email").max(120).optional().or(z.literal("")),
  childAge: z.enum(AGE_BANDS, { message: "Please select an age band" }),
  childDob: optionalText(20),
  programInterest: z.enum(PROGRAM_INTERESTS).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  // Attribution — captured from the landing URL, never shown to the visitor.
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(120),
  referredBy: optionalText(60),
  // Honeypot — bots fill it. Accept any value here and check emptiness after
  // parse: a max(0) constraint would fail validation and return a field error
  // that tells bots exactly which field is the trap.
  website: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

// Low-friction capture for the waitlist and prospectus magnet: name + phone
// only, age optional. `source` is constrained so the public endpoint can't be
// used to forge an arbitrary lead source.
export const CAPTURE_SOURCES = ["waitlist", "prospectus"] as const;

export const captureSchema = z.object({
  parentName: z.string().trim().min(2, "Please enter a name").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone may only contain digits and + - ( )"),
  whatsapp: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).optional(),
  email: z.string().trim().email("Please enter a valid email").max(120).optional().or(z.literal("")),
  childAge: z.enum(AGE_BANDS).optional().or(z.literal("")),
  source: z.enum(CAPTURE_SOURCES),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(120),
  referredBy: optionalText(60),
  website: z.string().optional(),
});

export type CaptureInput = z.infer<typeof captureSchema>;
