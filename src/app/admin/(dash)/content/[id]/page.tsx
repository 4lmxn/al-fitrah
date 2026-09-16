import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/posts";
import { updatePost, deletePost } from "../actions";
import { PostForm } from "@/components/admin/PostForm";
import { ActionForm } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/adminAuth";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ role }, post] = await Promise.all([requireAdmin(), getPost(id)]);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to content
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-emerald-deep">Edit post</h1>
          <p className="mt-1 text-sm text-ink/55">
            {post.published ? "Live on the website." : "Draft — not visible to visitors."}
          </p>
        </div>
        {post.published && (
          <Link href={`/news/${post.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5">
            <Icon name="open_in_new" className="text-[16px]" /> View on site
          </Link>
        )}
      </div>

      <div className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft sm:p-8">
        <PostForm action={updatePost} post={post} submitLabel="Save changes" />
      </div>

      {role === "owner" && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-5">
          <div>
            <p className="text-sm font-semibold text-red-800">Delete this post</p>
            <p className="text-xs text-red-700/70">Removes it and its image. This cannot be undone.</p>
          </div>
          <ActionForm
            action={deletePost}
            confirm={`Delete “${post.title}”? It comes off the website immediately, and its image is deleted too. This cannot be undone.`}
          >
            <input type="hidden" name="id" value={post.id} />
            <button type="submit" className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              Delete
            </button>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
