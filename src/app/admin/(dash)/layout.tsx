import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { Container } from "@/components/ui/Container";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-[100dvh] bg-cream-deep/30">
      <header className="bg-emerald text-cream">
        <Container className="flex items-center justify-between py-4">
          <Link href="/admin" className="font-display text-lg">Al Fitrah · Admin</Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-cream/70 sm:inline">{admin.email}</span>
            <LogoutButton />
          </div>
        </Container>
      </header>
      <main className="py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
