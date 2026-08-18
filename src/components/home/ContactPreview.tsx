import Image from "next/image";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Doodle } from "@/components/ui/Doodle";

const rows = (c: typeof home.contact) => [
  { icon: "location_on", label: "Address", value: c.address, tint: "bg-emerald/10 text-emerald" },
  { icon: "call", label: "Phone", value: c.phone, tint: "bg-coral-soft text-coral" },
  { icon: "mail", label: "Email", value: c.email, tint: "bg-grape-soft text-grape" },
];

export function ContactPreview() {
  const { contact } = home;
  return (
    <Section className="relative overflow-hidden">
      <Doodle kind="cloud" color="#dbeafe" motion="bob2" className="left-[4%] top-[10%] hidden w-12 lg:block" />
      <Container className="relative z-10 grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl">{contact.title}</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink/70">{contact.subtitle}</p>
          <ul className="mt-8 space-y-5">
            {rows(contact).map((r) => (
              <li key={r.label} className="flex items-start gap-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${r.tint}`}>
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
          <div className="arch relative aspect-[4/3] overflow-hidden border-[6px] border-white shadow-lift">
            <Image src={contact.image} alt={contact.imageAlt} fill sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
