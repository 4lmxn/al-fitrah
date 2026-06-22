import { getBucket } from "@/lib/firebaseAdmin";
import { sanitizeFilename } from "@/lib/applicationSchema";

export async function uploadCv(
  leadId: string,
  file: { buffer: Buffer; filename: string; contentType: string },
): Promise<{ path: string }> {
  const safe = sanitizeFilename(file.filename);
  const path = `applications/${leadId}/${safe}`;
  const blob = getBucket().file(path);
  await blob.save(file.buffer, {
    contentType: file.contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });
  return { path };
}

export async function getCvSignedUrl(path: string): Promise<string> {
  const [url] = await getBucket().file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });
  return url;
}

export async function deleteObject(path: string): Promise<void> {
  await getBucket().file(path).delete({ ignoreNotFound: true });
}
