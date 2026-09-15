import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { Icon } from "@/components/ui/Icon";
import { PaymentImport } from "@/components/admin/PaymentImport";

export const dynamic = "force-dynamic";

export default async function PaymentImportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/fees" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Fees
      </Link>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Finance</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Import payments</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Download the transaction report from SBI Collect and upload it here. Nothing is recorded
          until you have seen what it will do.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald/10 bg-cream/40 p-5 text-sm text-ink/75">
        <p className="font-semibold text-emerald-deep">Two things worth knowing</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            A payment is identified by its <strong>reference number</strong>. Uploading the same report
            twice records nothing the second time, so re-importing a month is safe.
          </li>
          <li>
            A row is matched to a child by <strong>admission number</strong>, never by name. If the
            number is missing or unknown, that row is held back for you rather than credited to a
            near match.
          </li>
        </ul>
      </div>

      <div className="mt-6">
        <PaymentImport />
      </div>
    </div>
  );
}
