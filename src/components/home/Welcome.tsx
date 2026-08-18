import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Wave } from "@/components/ui/Wave";
import { Doodle } from "@/components/ui/Doodle";

export function Welcome() {
  const { welcome } = home;
  return (
    // A white band cut out of the cream page with a wave at each edge — the
    // welcome note reads as a page in a picture book rather than another card.
    <div className="relative">
      <Wave fill="#ffffff" />
      <section className="relative overflow-hidden bg-white py-10 sm:py-14">
        <Doodle kind="crescent" color="#c9a227" motion="bob" className="left-[6%] top-8 hidden w-12 lg:block" />
        <Doodle kind="star" color="#ee7f82" motion="twinkle" className="bottom-10 right-[8%] w-5" />
        <Container className="relative z-10">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gold-soft text-gold mx-auto">
                <Icon name="mosque" className="text-[32px]" />
              </span>
              <p className="mt-4 font-display text-lg font-semibold text-coral">{welcome.eyebrow}</p>
              <h2 className="mt-1 text-3xl sm:text-4xl">{welcome.title}</h2>
              <div className="mx-auto mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-ink/75">
                {welcome.body.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}
              </div>
              <p className="mt-8 font-display text-xl font-bold text-emerald-deep">{welcome.by}</p>
              <p className="text-sm text-ink/55">{welcome.role}</p>
            </div>
          </Reveal>
        </Container>
      </section>
      <Wave fill="#ffffff" flip />
    </div>
  );
}
