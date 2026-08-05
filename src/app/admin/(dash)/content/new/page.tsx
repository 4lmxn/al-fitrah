import Link from "next/link";
import { createPost } from "../actions";
import { PostForm } from "@/components/admin/PostForm";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to content
      </Link>
      <h1 className="mt-4 font-display text-3xl text-emerald-deep">New post</h1>
      <p className="mt-1 text-sm text-ink/55">Publish news or an event to the website.</p>
      <div className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft sm:p-8">
        <PostForm action={createPost} submitLabel="Create post" />
      </div>
    </div>
  );
}
