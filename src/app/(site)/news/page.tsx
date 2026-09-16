import type { Metadata } from "next";
import Link from "next/link";
import { listPublished, POST_TYPE_LABEL } from "@/lib/posts";
import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { formatDate } from "@/lib/relativeTime";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/news", {
  title: "News & Events",
  description:
    "Announcements, notices and upcoming events from Al Fitrah Pre School, Sarjapura.",
});
}

export const revalidate = 3600;

export default async function NewsPage() {
  const posts = await listPublished().catch((err) => {
    console.error("news: read failed", err);
    return [];
  });

  return (
    <>
      <PageHero
        eyebrow="What's happening"
        title="News & events."
        highlight={["events"]}
        subtitle="Announcements, notices, and what's coming up at the school."
      />

      <Section className="pt-0 sm:pt-0">
        <Container className="max-w-4xl">
          {posts.length === 0 ? (
            <p className="rounded-xl4 bg-white p-10 text-center text-ink/60">
              Nothing posted just yet. Please check back soon, in shaa Allah.
            </p>
          ) : (
            <SwipeRail label="News and events" cols={2}>
              {posts.map((p) => (
                <div key={p.id} className="h-full">
                  <Link
                    href={`/news/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl4 bg-white shadow-soft transition duration-200 hover:-translate-y-2 hover:shadow-lift"
                  >
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" loading="lazy" className="h-44 w-full object-cover" />
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-deep">
                        <Icon name={p.type === "event" ? "event" : "campaign"} className="text-[14px]" />
                        {POST_TYPE_LABEL[p.type]}
                      </span>
                      <h2 className="mt-3 font-display text-xl font-bold text-emerald-deep group-hover:text-emerald">{p.title}</h2>
                      <p className="mt-1 text-xs text-ink/45">
                        {p.type === "event" && p.eventDateMs ? formatDate(p.eventDateMs, "long", "") : formatDate(p.publishedAtMs, "long", "")}
                        {p.location ? ` · ${p.location}` : ""}
                      </p>
                      <p className="mt-3 flex-1 leading-relaxed text-ink/70">{p.excerpt}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald">
                        Read more <Icon name="arrow_forward" className="text-[16px] transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </SwipeRail>
          )}
        </Container>
      </Section>
    </>
  );
}
