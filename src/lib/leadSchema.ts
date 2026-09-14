import { z } from "zod";

export const AGE_BANDS = ["below", "eligible", "above"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const leadSchema = z.object({
  parentName: z.string().trim().min(2, "Please enter a name").max(80),
  childName: optionalText(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone may only contain digits and + - ( )"),
  whatsapp: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).optional(),
  email: z.string().trim().email("Please enter a valid email").max(120).optional().or(z.literal("")),
  childAge: z.enum(AGE_BANDS, { message: "Please select an age band" }),
  childDob: optionalText(20),
  programInterest: optionalText(60),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(120),
  referredBy: optionalText(60),
  website: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

const CAPTURE_SOURCES = ["waitlist", "prospectus"] as const;

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
