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

/**
 * Read an object as a web stream, for proxying through an authenticated route.
 *
 * Replaces signed URLs deliberately. A signed URL is a bearer token: whoever
 * holds it gets the file with no session, it survives in browser history, and
 * generating one needs iam.serviceAccounts.signBlob — a permission Application
 * Default Credentials on App Hosting may not hold, which would only surface as
 * a production 500. Streaming has none of those properties.
 *
 * Existence is checked first so a missing object is a clean error rather than a
 * stream that fails midway through an already-committed 200 response.
 */
export async function streamObject(path: string): Promise<ReadableStream<Uint8Array>> {
  const file = getBucket().file(path);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`storage object not found: ${path}`);

  const node = file.createReadStream();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      node.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      node.on("end", () => controller.close());
      node.on("error", (err) => controller.error(err));
    },
    cancel() {
      // Client navigated away mid-download; stop pulling bytes we'll discard.
      node.destroy();
    },
  });
}

export async function deleteObject(path: string): Promise<void> {
  await getBucket().file(path).delete({ ignoreNotFound: true });
}
