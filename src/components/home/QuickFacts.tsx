import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export function QuickFacts() {
  return (
    <Container className="-mt-4 pb-4">
      <Reveal>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl3 border border-emerald/10 bg-emerald/10 shadow-soft sm:grid-cols-4">
          {home.quickFacts.map((f) => (
            <div key={f.label} className="flex items-center gap-3 bg-white/85 px-5 py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                <Icon name={f.icon} className="text-[22px]" />
              </span>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink/50">{f.label}</dt>
                <dd className="font-display text-lg text-emerald-deep">{f.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Reveal>
    </Container>
  );
}
