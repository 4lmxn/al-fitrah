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

/**
 * Move an object between prefixes.
 *
 * Exists for the resource centre, where the prefix IS the permission: a file
 * shared publicly lives under `content/` and is world-readable, and one shared
 * with parents lives under `resources/` and is not. Un-publishing therefore has
 * to relocate the bytes. Leaving them behind would keep the old URL working for
 * anyone who ever saw it — the file would be "private" everywhere except where
 * it actually is.
 */
export async function moveObject(from: string, to: string): Promise<void> {
  if (from === to) return;
  await getBucket().file(from).move(to);
}

// ── Student photos ──────────────────────────────────────────────────────────

/**
 * A child's photograph is the most identifying thing this system stores, so it
 * gets a tighter cap than a news image: enough for a clear headshot, not enough
 * to be a route to filling the bucket from the admin console.
 */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * Store a student's photo and return its path.
 *
 * A path, never a URL, and deliberately not in a public prefix. There is no
 * address for this file that works without a session — see the note on
 * Student.photoPath. Content type comes from the sniffed bytes, so a file
 * claiming to be a PNG can never be served as something the browser executes.
 *
 * The name is derived from the student id, not random, so replacing a photo
 * overwrites rather than accumulating one orphan per upload. Cache-busting is
 * the serving route's problem, not the object's.
 */
export async function uploadStudentPhoto(
  studentId: string,
  file: { buffer: Buffer; contentType: string },
): Promise<{ path: string }> {
  const ext = IMAGE_TYPES[file.contentType] ?? "bin";
  const path = `students/${studentId}/photo.${ext}`;
  await getBucket().file(path).save(file.buffer, {
    contentType: file.contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });
  return { path };
}

/**
 * Store a document against a child and return its path.
 *
 * The object name is random, not derived from what the uploader called the
 * file. Two reasons: a guardian and the office can both upload "certificate.pdf"
 * without one silently replacing the other, and the bucket listing never
 * becomes a readable index of what each family submitted.
 *
 * The display name lives in Firestore, where it belongs — see
 * src/lib/studentDocuments.ts.
 */
export async function uploadStudentDocument(
  studentId: string,
  docId: string,
  file: { buffer: Buffer; contentType: string; ext: string },
): Promise<{ path: string }> {
  const path = `students/${studentId}/documents/${docId}.${file.ext}`;
  await getBucket().file(path).save(file.buffer, {
    contentType: file.contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });
  return { path };
}

// ── Resource centre files ───────────────────────────────────────────────────

export const MAX_RESOURCE_BYTES = 20 * 1024 * 1024;

/**
 * What staff may upload.
 *
 * An allowlist, not a blocklist, and deliberately without HTML or SVG. Both are
 * documents a browser will execute, and a public resource is served from a URL
 * on Google's storage domain with the type we record — an uploaded page that
 * runs script is a real hazard, not a theoretical one. Everything here is inert
 * when opened, or opens in an application rather than the browser.
 */
export const ACCEPTED_RESOURCE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/plain": "TXT",
  "application/zip": "ZIP",
  "audio/mpeg": "MP3",
  "video/mp4": "MP4",
};

export function validateResourceFile(
  file: { type: string; size: number },
): { ok: true } | { ok: false; error: string } {
  if (!file.size) return { ok: false, error: "That file looks empty." };
  if (!ACCEPTED_RESOURCE_TYPES[file.type]) {
    return { ok: false, error: "Use a PDF, image, Office document, text file, ZIP, MP3 or MP4." };
  }
  if (file.size > MAX_RESOURCE_BYTES) {
    return { ok: false, error: "Files must be 20 MB or smaller." };
  }
  return { ok: true };
}

/**
 * Where a resource's bytes belong, given who it is shared with.
 *
 * `content/` is world-readable by the Storage rules; everything else is closed.
 * So this function, not a field, is what makes a file public — which means the
 * question "is this file reachable without a login" has exactly one answer, and
 * it is the one the storage rules enforce.
 */
export function resourceStoragePath(id: string, fileName: string, isPublic: boolean): string {
  const safe = sanitizeFilename(fileName);
  return isPublic ? `content/resources/${id}/${safe}` : `resources/${id}/${safe}`;
}

export function publicUrlFor(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${getBucket().name}/o/${encodeURIComponent(path)}?alt=media`;
}

export async function uploadResource(
  path: string,
  file: { buffer: Buffer; contentType: string; fileName: string },
): Promise<void> {
  const isPublic = path.startsWith("content/");
  await getBucket().file(path).save(file.buffer, {
    contentType: file.contentType,
    resumable: false,
    metadata: {
      // Public files are immutable at their path (the id and name are in it),
      // so they cache hard. Private ones are streamed through a route that sets
      // its own headers, and must never be held by an intermediary.
      cacheControl: isPublic ? "public, max-age=3600" : "private, max-age=0",
      // Forces a download rather than an inline render even for types a browser
      // would happily display, so a public file can never be pointed at as a
      // page hosted under the school's name.
      contentDisposition: `attachment; filename="${sanitizeFilename(file.fileName)}"`,
    },
  });
}

// ── Public content images (news / events) ───────────────────────────────────

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Magic bytes for the formats above. The browser-declared MIME type is
// attacker-controlled, and these files end up served publicly from our origin,
// so the actual bytes decide what is stored.
const IMAGE_SIGNATURES: [string, number[]][] = [
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
];

export function detectImageType(buf: Uint8Array): string | null {
  for (const [type, sig] of IMAGE_SIGNATURES) {
    if (sig.every((byte, i) => buf[i] === byte)) {
      // WEBP shares the RIFF header with other container formats; the format
      // tag at offset 8 is what actually distinguishes it.
      if (type === "image/webp") {
        const tag = String.fromCharCode(...buf.slice(8, 12));
        if (tag !== "WEBP") continue;
      }
      return type;
    }
  }
  return null;
}

export function validateImage(
  file: { type: string; size: number },
): { ok: true } | { ok: false; error: string } {
  if (!file.size) return { ok: false, error: "That image looks empty." };
  if (!IMAGE_TYPES[file.type]) return { ok: false, error: "Use a JPG, PNG or WebP image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be 4 MB or smaller." };
  return { ok: true };
}

/**
 * Can post images be published to the configured bucket?
 *
 * Post images are the one thing here served straight from the bucket by URL,
 * rather than streamed through an authenticated route. That only works on a
 * Firebase-registered bucket with public reads — the `?alt=media` download
 * endpoint serves nothing else.
 *
 * The bucket holding CVs and student documents is deliberately not that: it
 * sits in asia-south1 with public access prevention enforced, because those are
 * children's records and an applicant's CV, and nothing about them should be
 * reachable by URL. See docs/deploy-cloudrun-cloudflare.md §9.
 *
 * So the two uses want opposite buckets, and this reports which one is
 * configured. Callers refuse the upload rather than storing an object and
 * handing back a URL that 404s — a broken image on the public news page with
 * no error anywhere is exactly the silent failure this codebase keeps removing.
 */
export function publicImagesSupported(): boolean {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  return /\.(firebasestorage\.app|appspot\.com)$/.test(name);
}

/**
 * Store a post image and return its public URL.
 *
 * Content-Type comes from the sniffed bytes, not the upload, so a file claiming
 * to be a PNG can never be served as something the browser will execute.
 *
 * Guarded by publicImagesSupported() at the call site — see above.
 */
export async function uploadPostImage(
  postId: string,
  file: { buffer: Buffer; contentType: string },
): Promise<{ path: string; url: string }> {
  const ext = IMAGE_TYPES[file.contentType] ?? "bin";
  // Cache-busting name: replacing an image must not leave the old one cached
  // under the same URL for a year.
  const path = `content/posts/${postId}/${Date.now()}.${ext}`;
  const bucket = getBucket();
  await bucket.file(path).save(file.buffer, {
    contentType: file.contentType,
    resumable: false,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  return {
    path,
    url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`,
  };
}
