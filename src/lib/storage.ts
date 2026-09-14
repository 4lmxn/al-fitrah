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
      node.destroy();
    },
  });
}

export async function deleteObject(path: string): Promise<void> {
  await getBucket().file(path).delete({ ignoreNotFound: true });
}

export async function moveObject(from: string, to: string): Promise<void> {
  if (from === to) return;
  await getBucket().file(from).move(to);
}

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

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

export const MAX_RESOURCE_BYTES = 20 * 1024 * 1024;

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
      cacheControl: isPublic ? "public, max-age=3600" : "private, max-age=0",
      contentDisposition: `attachment; filename="${sanitizeFilename(file.fileName)}"`,
    },
  });
}

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const IMAGE_SIGNATURES: [string, number[]][] = [
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
];

export function detectImageType(buf: Uint8Array): string | null {
  for (const [type, sig] of IMAGE_SIGNATURES) {
    if (sig.every((byte, i) => buf[i] === byte)) {
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

export function publicImagesSupported(): boolean {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  return /\.(firebasestorage\.app|appspot\.com)$/.test(name);
}

export async function uploadPostImage(
  postId: string,
  file: { buffer: Buffer; contentType: string },
): Promise<{ path: string; url: string }> {
  const ext = IMAGE_TYPES[file.contentType] ?? "bin";
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
