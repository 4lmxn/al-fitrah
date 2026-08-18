import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedBySlug, publishedSlugs, POST_TYPE_LABEL } from "@/lib/posts";
import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 3600;

// Prerender the recent ones at build; anything older renders on first request
// and is then cached. Prerendering the whole archive would make build time grow
// with the school's history for pages almost nobody opens.
export async function generateStaticParams() {
  return (await publishedSlugs().catch(() => [])).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug).catch(() => null);
  if (!post) return pageMeta(`/news/${slug}`, { title: "Not found", description: "" });
  return pageMeta(`/news/${post.slug}`, { title: post.title, description: post.excerpt });
}

function fmt(ms: number | null): string {
  return ms ? new Date(ms).toLocaleDateString("en-IN", { dateStyle: "long" }) : "";
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug).catch((err) => {
    console.error("news post: read failed", err);
    return null;
  });
  if (!post) notFound();

  return (
    <Section>
      <Container className="max-w-3xl">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:text-emerald-deep">
          <Icon name="arrow_back" className="text-[18px]" /> All news &amp; events
        </Link>

        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-deep">
          <Icon name={post.type === "event" ? "event" : "campaign"} className="text-[14px]" />
          {POST_TYPE_LABEL[post.type]}
        </span>

        <h1 className="mt-3 font-display text-4xl leading-tight text-emerald-deep">{post.title}</h1>
        <p className="mt-2 text-sm text-ink/50">
          {post.type === "event" && post.eventDateMs ? fmt(post.eventDateMs) : fmt(post.publishedAtMs)}
          {post.location ? ` · ${post.location}` : ""}
        </p>

        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt="" className="mt-7 w-full rounded-xl4 object-cover shadow-soft" />
        )}

        {/* Rendered as plain paragraphs, never as HTML. The editor is a plain
            textarea, so treating its contents as markup would turn the CMS into
            a stored-XSS surface for anyone with admin access. */}
        <div className="mt-8 space-y-4 text-lg leading-relaxed text-ink/80">
          {post.body.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </Container>
    </Section>
  );
}
