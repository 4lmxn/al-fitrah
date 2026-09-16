import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { listForAudience, type Resource } from "@/lib/resources";
import { formatBytes } from "@/lib/bytes";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/resources", {
    title: "Downloads",
    description:
      "Forms, calendars and newsletters from Al Fitrah Pre School, Sarjapura — free to download for families and visitors.",
  });
}

export const revalidate = 3600;

async function safeResources(): Promise<Resource[]> {
  try {
    return await listForAudience(["public"]);
  } catch (err) {
    console.error("resources: read failed", err);
    return [];
  }
}

export default async function ResourcesPage() {
  const resources = await safeResources();

  return (
    <>
      <PageHero
        eyebrow="Downloads"
        title="Everything in one place."
        subtitle="Forms, calendars and newsletters, free to download."
      />

      <Section>
        <Container>
          {resources.length === 0 ? (
            <p className="mx-auto max-w-xl text-center text-lg text-ink/60">
              Nothing to download just yet. Please check back soon, or contact the school office and
              we will send what you need.
            </p>
          ) : (
            <ul className="mx-auto grid max-w-3xl gap-4">
              {resources.map((r, i) => (
                <Reveal key={r.id} delay={i * 0.05}>
                  <li>
                    <a
                      href={r.publicUrl ?? `/api/resources/${r.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft transition hover:shadow-lift"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald/8 text-emerald-deep">
                        <Icon name="description" className="text-[22px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-lg text-emerald-deep">{r.title}</span>
                        {r.description && (
                          <span className="mt-0.5 block text-sm text-ink/60">{r.description}</span>
                        )}
                        <span className="mt-1 block text-xs text-ink/45">
                          {r.category ? `${r.category} · ` : ""}
                          {formatBytes(r.sizeBytes)}
                        </span>
                      </span>
                      <Icon name="download" className="shrink-0 text-[20px] text-emerald" />
                    </a>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
