import { z } from "zod";

// Entry is only at Pre-KG for children aged 2y10m–3y10m, so the inquiry
// captures eligibility rather than a tier.
export const AGE_BANDS = ["below", "eligible", "above"] as const;

export const leadSchema = z.object({
  parentName: z.string().trim().min(2, "Please enter a name").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone may only contain digits and + - ( )"),
  email: z.string().trim().email("Please enter a valid email").max(120).optional().or(z.literal("")),
  childAge: z.enum(AGE_BANDS, { message: "Please select an age band" }),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  // Honeypot — bots fill it. Accept any value here and check emptiness after
  // parse: a max(0) constraint would fail validation and return a field error
  // that tells bots exactly which field is the trap.
  website: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
