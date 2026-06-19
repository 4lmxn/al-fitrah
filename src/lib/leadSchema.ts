import { z } from "zod";

export const AGE_BANDS = ["2-3", "3-4", "4-5", "5-6"] as const;

export const leadSchema = z.object({
  parentName: z.string().trim().min(2, "Please enter a name").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone may only contain digits and + - ( )"),
  email: z.string().trim().email("Please enter a valid email").max(120).optional().or(z.literal("")),
  childAge: z.enum(AGE_BANDS, { message: "Please select an age band" }),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  // Honeypot — must stay empty (bots fill it).
  website: z.string().max(0).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
