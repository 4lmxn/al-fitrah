import { z } from "zod";

export const MAX_CV_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone may only contain digits and + - ( )"),
  email: z.string().trim().email("Please enter a valid email").max(120).optional().or(z.literal("")),
  role: z.string().trim().min(2, "Please select or enter a role").max(100),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot — bots fill it. Accept any value here and check emptiness after
  // parse: a max(0) constraint would fail validation and return a field error
  // that tells bots exactly which field is the trap.
  website: z.string().optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export function validateCvFile(
  file: { type: string; size: number; name: string },
): { ok: true } | { ok: false; error: string } {
  if (!file || file.size === 0) return { ok: false, error: "Please attach your CV." };
  if (!ACCEPTED_CV_TYPES.includes(file.type)) {
    return { ok: false, error: "CV must be a PDF, DOC, or DOCX file." };
  }
  if (file.size > MAX_CV_BYTES) {
    return { ok: false, error: "CV must be 5 MB or smaller." };
  }
  return { ok: true };
}

// Magic-byte signatures for the accepted CV formats: %PDF, OLE compound
// document (.doc), ZIP (.docx). The browser-supplied MIME type is attacker
// controlled, so the actual bytes are checked before upload.
const CV_SIGNATURES: number[][] = [
  [0x25, 0x50, 0x44, 0x46], // %PDF
  [0xd0, 0xcf, 0x11, 0xe0], // .doc
  [0x50, 0x4b, 0x03, 0x04], // .docx
];

export function hasValidCvSignature(buf: Uint8Array): boolean {
  return CV_SIGNATURES.some((sig) => sig.every((byte, i) => buf[i] === byte));
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const ext = dot > 0 ? base.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "") : "";
  const safeStem = stem || "cv";
  return ext ? `${safeStem}.${ext}` : safeStem;
}
