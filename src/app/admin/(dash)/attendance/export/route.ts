import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { recordAudit } from "@/lib/audit";
import { csvDocument, csvFilename } from "@/lib/csv";
import { academicYearFor, listClassRoster } from "@/lib/students";
import { getAttendanceStatuses, getClassSections } from "@/lib/taxonomy";
import { attendanceMatrix, dateKey, listRegisters, monthBounds } from "@/lib/attendance";

export const runtime = "nodejs";

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const url = new URL(req.url);
  const sections = await getClassSections();
  const requested = url.searchParams.get("class") ?? "";
  const classSection = sections.includes(requested) ? requested : sections[0];
  if (!classSection) {
    return NextResponse.json(
      { ok: false, error: "No class sections are configured yet." },
      { status: 400 },
    );
  }

  const monthParam = url.searchParams.get("month");
  const anchor = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? `${monthParam}-01` : dateKey();
  const { from, to } = monthBounds(anchor);
  const academicYear = academicYearFor(new Date(`${anchor}T00:00:00`));

  const [roster, registers, statuses] = await Promise.all([
    listClassRoster(classSection),
    listRegisters(academicYear, classSection, from, to),
    getAttendanceStatuses(),
  ]);

  const { header, rows } = attendanceMatrix(roster, registers, statuses);

  await recordAudit({
    actor: admin.email,
    action: "attendance.exported",
    entity: { type: "attendance", id: `${academicYear}_${classSection}` },
    summary: `Exported ${classSection} attendance for ${from} to ${to}`,
    meta: { classSection, from, to, children: roster.length, days: registers.length },
  });

  return new NextResponse(csvDocument(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(`attendance-${classSection}-${from.slice(0, 7)}`)}"`,
    },
  });
}
