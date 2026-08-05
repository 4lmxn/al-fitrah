import Link from "next/link";
import { StudentImport } from "@/components/admin/StudentImport";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default function ImportStudentsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to students
      </Link>
      <h1 className="mt-4 font-display text-3xl text-emerald-deep">Import students</h1>
      <p className="mt-1 text-sm text-ink/55">
        Bring an existing roll in from a spreadsheet. You&apos;ll see exactly what will be added before anything is saved.
      </p>
      <div className="mt-7">
        <StudentImport />
      </div>
    </div>
  );
}
