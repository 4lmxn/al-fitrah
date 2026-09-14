import "server-only";
import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { ROSTER_COLLECTION, ROSTER_DOC, type Role, type RosterEntry } from "@/lib/roles";

export const COLLECTION = "staff";

export const MAX_STAFF = 200;

export type StaffStatus = "active" | "inactive";

export type StaffMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  designation: string;
  role: Role;
  access: boolean;
  status: StaffStatus;
  joinedAtMs: number | null;
  note: string | null;
};

export function toStaff(d: FirebaseFirestore.DocumentSnapshot): StaffMember {
  const x = d.data() ?? {};
  return {
    id: d.id,
    name: x.name ?? "—",
    email: x.email ?? null,
    phone: x.phone ?? "",
    designation: x.designation ?? "",
    role: x.role === "owner" ? "owner" : "staff",
    access: Boolean(x.access),
    status: x.status === "inactive" ? "inactive" : "active",
    joinedAtMs: x.joinedAt?.toMillis?.() ?? null,
    note: x.note ?? null,
  };
}

export function rosterFrom(members: StaffMember[]): RosterEntry[] {
  return members
    .filter((m) => m.access && m.status === "active" && m.email)
    .map((m) => ({ email: m.email!.trim().toLowerCase(), role: m.role }));
}

export function queueRoster(db: Firestore, batch: WriteBatch, roster: RosterEntry[]): void {
  batch.set(db.collection(ROSTER_COLLECTION).doc(ROSTER_DOC), {
    members: roster,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function listStaff(): Promise<StaffMember[]> {
  await requireAdmin();
  const snap = await getDb().collection(COLLECTION).orderBy("name").limit(MAX_STAFF).get();
  return snap.docs.map(toStaff);
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  await requireAdmin();
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  return doc.exists ? toStaff(doc) : null;
}

export async function currentRoster(): Promise<RosterEntry[]> {
  const snap = await getDb().collection(COLLECTION).limit(MAX_STAFF).get();
  return rosterFrom(snap.docs.map(toStaff));
}
