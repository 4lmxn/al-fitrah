"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function LogoutButton() {
  const router = useRouter();
  async function onLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/admin/login");
  }
  return (
    <button
      type="button"
      onClick={onLogout}
      className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-sm font-semibold text-cream/90 transition hover:bg-cream/10"
    >
      <Icon name="logout" className="text-[18px]" /> Sign out
    </button>
  );
}
