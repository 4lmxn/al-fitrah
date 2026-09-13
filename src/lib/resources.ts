import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

/**
 * Resource centre — the school's files, shared with the people they are for.
 *
 * Metadata lives here; bytes live in Cloud Storage. The document never holds a
 * file, only a path to one, so a list of forty worksheets costs forty small
 * reads rather than transferring the worksheets themselves.
 *
 * WHO CAN SEE A FILE IS DECIDED BY WHERE IT IS STORED, not only by a field.
 *
 *   audience includes "public"  → stored under `content/`, world-readable by
 *                                 URL, served straight from Cloud Storage. Free,
 *                                 cached, and no request touches this app.
 *   everything else             → stored under `resources/`, closed to every
 *                                 client by the Storage rules, and reachable
 *                                 only by streaming through an authenticated
 *                                 route.
 *
 * The public path is available only on a bucket that has a public read
 * endpoint. The Mumbai files bucket does not, so a public file there takes the
 * closed path and the download route serves it to anonymous viewers instead —
 * slower and billed to this app, but never a URL that 404s. See
 * `servedStraightFromStorage` in the resources actions.
 *
 * The split matters because the alternative — one private location plus a
 * boolean — makes a public prospectus cost a server request and a Firestore
 * read per download, and makes the visibility of a leaked file depend on a
 * field being read correctly every time.
 *
 * Changing the audience across that boundary MOVES the object (see
 * `moveObject`). Without that, un-publishing a file would leave it sitting at a
 * stable, world-readable URL that anyone who once saw it can still fetch —
 * exactly the leak the rules are meant to prevent.
 *
 * The expansion plan (§3.1) proposed short-lived signed URLs for private files.
 * Streaming is used instead, for the reasons already recorded in lib/storage:
 * a signed URL is a bearer token that outlives the session and lands in browser
 * history, and signing needs an IAM permission that App Hosting's default
 * credentials may not hold — a failure that only appears in production.
 */

export const COLLECTION = "resources";

/**
 * Who a file is for.
 *
 * The brief listed six audiences: public, parents, students, teachers, staff,
 * admin. Three of those have no identity in this system yet — there is no
 * student login, and teachers exist only as hired applications, not as
 * employees (see EXPANSION_PLAN §4.3). An audience nobody can sign in as is a
 * checkbox that silently shares a file with no one, so only the three that
 * resolve to a real session exist here. `teachers` follows the `staff`
 * collection, and `students` follows student logins.
 */
export const AUDIENCES = ["public", "parents", "staff"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<Audience, string> = {
  public: "Anyone",
  parents: "Signed-in parents",
  staff: "Staff only",
};

/**
 * Virus scanning is a hook, not an implementation.
 *
 * Nothing scans uploads today. The state and the gate exist anyway, because
 * adding them later means retrofitting a state machine onto a collection that
 * already has documents, and deciding then what an unscanned legacy file counts
 * as. Wiring a scanner is now: write "pending" on upload, and have the scanner
 * flip it to "clean" or "infected". Nothing else changes.
 */
export type ScanStatus = "clean" | "pending" | "infected";

export type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  /** Which class it belongs to, when it belongs to one. */
  classSection: string | null;
  academicYear: string;
  audience: Audience[];
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  /** Set only for public files, which are served straight from Storage. */
  publicUrl: string | null;
  scanStatus: ScanStatus;
  downloadCount: number;
  uploadedBy: string;
  createdAtMs: number | null;
  updatedAtMs: number | null;
};

// Same ceiling discipline as every other list here: the page bounds the read
// count, and a school that outgrows a page gets pagination, not a bigger query.
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

/** A file shared with nobody is hidden, without needing a second flag for it. */
export function isHidden(r: Resource): boolean {
  return r.audience.length === 0;
}

/**
 * May this viewer download this file?
 *
 * Pure, and the only place the question is answered, so the public page, the
 * portal and the download route cannot drift apart on it. Staff see everything:
 * they are the people who uploaded it.
 */
export function canDownload(
  r: Pick<Resource, "audience" | "scanStatus">,
  viewer: "public" | "parent" | "staff",
): boolean {
  // An unscanned or infected file is downloadable by nobody, including staff.
  // A scanner that only protects parents protects nobody, since the admin
  // console is where an infected file would be opened first.
  if (r.scanStatus !== "clean") return false;
  if (viewer === "staff") return true;
  if (viewer === "parent") return r.audience.includes("parents") || r.audience.includes("public");
  return r.audience.includes("public");
}

function baseQuery() {
  return getDb().collection(COLLECTION).orderBy("createdAt", "desc");
}

/** Admin list, newest first, paginated on the creation timestamp. */
export async function listResources(cursorMs?: number): Promise<{ rows: Resource[]; nextCursor: number | null }> {
  // Auth in the data layer, not the layout — layouts do not re-render on client
  // navigation, so they are not a reliable gate.
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

/**
 * Files visible to an audience.
 *
 * No auth check here on purpose: this answers "what is shared with X", and the
 * caller is what establishes that the viewer is an X. The public page passes
 * `["public"]` and is cached; the portal passes `["parents","public"]` behind
 * requireParent().
 */
export async function listForAudience(audiences: Audience[], max = PAGE_SIZE): Promise<Resource[]> {
  if (audiences.length === 0) return [];
  const snap = await baseQuery()
    .where("audience", "array-contains-any", audiences)
    .limit(max)
    .get();
  // Filtered rather than queried: an unscanned file must not appear at all, and
  // adding scanStatus to the query would cost a second composite index for a
  // condition that is true of essentially every document.
  return snap.docs.map(toResource).filter((r) => r.scanStatus === "clean");
}

export async function getResource(id: string): Promise<Resource | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? toResource(doc) : null;
}
