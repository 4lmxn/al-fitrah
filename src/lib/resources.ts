import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export const COLLECTION = "resources";

export const AUDIENCES = ["public", "parents", "staff"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<Audience, string> = {
  public: "Anyone",
  parents: "Signed-in parents",
  staff: "Staff only",
};

export type ScanStatus = "clean" | "pending" | "infected";

export type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  classSection: string | null;
  academicYear: string;
  audience: Audience[];
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string | null;
  scanStatus: ScanStatus;
  downloadCount: number;
  uploadedBy: string;
  createdAtMs: number | null;
  updatedAtMs: number | null;
};

export const PAGE_SIZE = 25;

export function toResource(
  d: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
): Resource {
  const x = d.data() ?? {};
  return {
    id: d.id,
    title: x.title ?? "",
    description: x.description ?? "",
    category: x.category ?? "",
    classSection: x.classSection ?? null,
    academicYear: x.academicYear ?? "",
    audience: Array.isArray(x.audience) ? x.audience.filter(isAudience) : [],
    fileName: x.fileName ?? "file",
    contentType: x.contentType ?? "application/octet-stream",
    sizeBytes: Number(x.sizeBytes) || 0,
    storagePath: x.storagePath ?? "",
    publicUrl: x.publicUrl ?? null,
    scanStatus: x.scanStatus === "pending" || x.scanStatus === "infected" ? x.scanStatus : "clean",
    downloadCount: Number(x.downloadCount) || 0,
    uploadedBy: x.uploadedBy ?? "—",
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
    updatedAtMs: x.updatedAt?.toMillis?.() ?? null,
  };
}

export function isAudience(v: unknown): v is Audience {
  return typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);
}

export function isHidden(r: Resource): boolean {
  return r.audience.length === 0;
}

export function canDownload(
  r: Pick<Resource, "audience" | "scanStatus">,
  viewer: "public" | "parent" | "staff",
): boolean {
  if (r.scanStatus !== "clean") return false;
  if (viewer === "staff") return true;
  if (viewer === "parent") return r.audience.includes("parents") || r.audience.includes("public");
  return r.audience.includes("public");
}

function baseQuery() {
  return getDb().collection(COLLECTION).orderBy("createdAt", "desc");
}

export async function listResources(cursorMs?: number): Promise<{ rows: Resource[]; nextCursor: number | null }> {
  await requireAdmin();
  let q = baseQuery();
  if (cursorMs) q = q.startAfter(new Date(cursorMs));
  const snap = await q.limit(PAGE_SIZE + 1).get();
  const rows = snap.docs.slice(0, PAGE_SIZE).map(toResource);
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor: snap.size > PAGE_SIZE && last?.createdAtMs ? last.createdAtMs : null,
  };
}

export async function listForAudience(audiences: Audience[], max = PAGE_SIZE): Promise<Resource[]> {
  if (audiences.length === 0) return [];
  const snap = await baseQuery()
    .where("audience", "array-contains-any", audiences)
    .limit(max)
    .get();
  return snap.docs.map(toResource).filter((r) => r.scanStatus === "clean");
}

export async function getResource(id: string): Promise<Resource | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? toResource(doc) : null;
}
