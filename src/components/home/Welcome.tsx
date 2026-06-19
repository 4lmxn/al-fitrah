import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export function Welcome() {
  const { welcome } = home;
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 p-10 text-center shadow-soft sm:p-14">
            <div className="bg-geo pointer-events-none absolute inset-0 opacity-50" aria-hidden />
            <div className="relative">
              <Icon name="mosque" className="text-[36px] text-gold" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gold">{welcome.eyebrow}</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">{welcome.title}</h2>
              <div className="mx-auto mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-ink/75">
                {welcome.body.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}
              </div>
              <p className="mt-8 font-display text-xl text-emerald-deep">{welcome.by}</p>
              <p className="text-sm text-ink/55">{welcome.role}</p>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
