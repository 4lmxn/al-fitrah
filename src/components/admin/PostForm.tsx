"use client";
import { useState } from "react";
import { POST_TYPES, POST_TYPE_LABEL, type Post, type PostType } from "@/lib/postMeta";
import type { ActionResult } from "@/lib/actionResult";
import { ActionForm } from "@/components/admin/ActionForm";
import { Icon } from "@/components/ui/Icon";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";

function toDateInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function PostForm({
  action,
  post,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  post?: Post;
  submitLabel: string;
}) {
  // Event-only fields appear as the type changes, rather than being always
  // present and ignored — a date box on a news item is a question with no
  // right answer.
  const [type, setType] = useState<PostType>(post?.type ?? "news");

  return (
    <ActionForm action={action} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Type</span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as PostType)}
            className={field}
          >
            {POST_TYPES.map((t) => (
              <option key={t} value={t}>{POST_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Title</span>
          <input name="title" required defaultValue={post?.title} placeholder="Annual Day 2026" className={field} />
        </label>
      </div>

      {type === "event" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Event date</span>
            <input type="date" name="eventDate" required defaultValue={toDateInput(post?.eventDateMs ?? null)} className={field} />
          </label>
          <label className="block">
            <span className={label}>Location</span>
            <input name="location" defaultValue={post?.location ?? ""} placeholder="School campus" className={field} />
          </label>
        </div>
      )}

      <label className="block">
        <span className={label}>Short summary</span>
        <input name="excerpt" defaultValue={post?.excerpt} placeholder="One line for the card — leave blank to use the opening of the post" className={field} />
      </label>

      <label className="block">
        <span className={label}>Content</span>
        <textarea name="body" required rows={10} defaultValue={post?.body} className={`${field} resize-y`} />
        <span className="mt-1 block text-[11px] text-ink/45">Blank lines start a new paragraph.</span>
      </label>

      <label className="block">
        <span className={label}>Image {post?.imageUrl && "(replaces the current one)"}</span>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className={`${field} file:mr-3 file:rounded-full file:border-0 file:bg-emerald file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-cream`} />
        <span className="mt-1 block text-[11px] text-ink/45">JPG, PNG or WebP, up to 4 MB.</span>
      </label>

      {post?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="h-32 w-auto rounded-lg object-cover ring-1 ring-emerald/10" />
      )}

      <label className="flex items-center gap-2 rounded-xl border border-emerald/15 bg-cream/30 px-4 py-3 text-sm">
        <input type="checkbox" name="published" defaultChecked={post?.published} className="h-4 w-4 rounded accent-emerald" />
        <span className="font-semibold text-emerald-deep">Publish to the website</span>
        <span className="text-xs text-ink/50">Unchecked keeps it as a draft only you can see.</span>
      </label>

      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-full bg-emerald px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
      >
        <Icon name="check" className="text-[18px]" /> {submitLabel}
      </button>
    </ActionForm>
  );
}
