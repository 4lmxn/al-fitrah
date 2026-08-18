import Link from "next/link";
import { listAllPosts, POST_TYPE_LABEL } from "@/lib/posts";
import { togglePublished } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const posts = await listAllPosts();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Website</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">News &amp; events</h1>
          <p className="mt-1 text-sm text-ink/55">What appears on the website&apos;s news page and homepage.</p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 rounded-full bg-emerald px-4 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-emerald-deep"
        >
          <Icon name="add" className="text-[18px]" /> New post
        </Link>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-emerald/10 bg-white/90 shadow-soft">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
              <Icon name="article" className="text-[30px]" />
            </span>
            <p className="font-display text-lg text-emerald-deep">Nothing posted yet</p>
            <p className="max-w-sm text-sm text-ink/50">
              Add a notice, an announcement, or an upcoming event and it appears on the website.
            </p>
            <Link href="/admin/content/new" className="mt-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
              Write the first post
            </Link>
          </div>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className="border-b border-emerald/10 bg-cream/40 text-[11px] uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">Type</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">Updated</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald/5">
              {posts.map((p) => (
                <tr key={p.id} className="group transition hover:bg-emerald/[0.035]">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/content/${p.id}`} className="font-semibold text-emerald-deep hover:text-emerald">
                      {p.title}
                    </Link>
                    {p.eventDateMs && (
                      <span className="ml-2 text-xs text-ink/45">
                        {new Date(p.eventDateMs).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-5 py-3.5 text-ink/70 sm:table-cell">{POST_TYPE_LABEL[p.type]}</td>
                  <td className="hidden px-5 py-3.5 text-ink/55 md:table-cell">{relativeTime(p.updatedAtMs)}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        p.published ? "bg-emerald/8 text-emerald-deep" : "bg-ink/5 text-ink/50"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.published ? "bg-emerald" : "bg-ink/30"}`} />
                      {p.published ? "Live" : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ActionForm action={togglePublished} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="published" value={String(!p.published)} />
                      <button
                        type="submit"
                        className="rounded-full px-3 py-1.5 text-xs font-semibold text-emerald opacity-70 transition hover:bg-emerald/5 group-hover:opacity-100"
                      >
                        {p.published ? "Unpublish" : "Publish"}
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
