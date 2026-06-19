import Image from "next/image";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const rows = (c: typeof home.contact) => [
  { icon: "location_on", label: "Address", value: c.address },
  { icon: "call", label: "Phone", value: c.phone },
  { icon: "mail", label: "Email", value: c.email },
];

export function ContactPreview() {
  const { contact } = home;
  return (
    <Section>
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl">{contact.title}</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink/70">{contact.subtitle}</p>
          <ul className="mt-8 space-y-5">
            {rows(contact).map((r) => (
              <li key={r.label} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                  <Icon name={r.icon} className="text-[22px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">{r.label}</p>
                  <p className="mt-0.5 text-ink/80">{r.value}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button href="/contact" variant="outline">Plan a visit</Button>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl3 border border-emerald/10 shadow-soft">
            <Image src={contact.image} alt={contact.imageAlt} fill sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
