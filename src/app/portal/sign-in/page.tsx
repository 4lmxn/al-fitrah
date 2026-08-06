import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { ParentSignIn } from "@/components/portal/ParentSignIn";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Parent sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ParentSignInPage() {
  const { school } = await getSettings();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-cream-deep/40 px-6 py-12">
      <div className="w-full max-w-sm rounded-xl3 border border-emerald/10 bg-white/90 p-8 shadow-lift">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald/8 text-emerald ring-1 ring-emerald/10">
          <Icon name="family_restroom" className="text-[28px]" />
        </span>
        <h1 className="text-center text-2xl text-emerald-deep">Parent sign in</h1>
        <p className="mt-2 text-center text-sm text-ink/60">
          {school.name} — sign in with the email or mobile number the school has on record.
        </p>
        <ParentSignIn />
      </div>
    </div>
  );
}
