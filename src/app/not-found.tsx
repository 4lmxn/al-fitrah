import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getContact, getBrandName } from "@/lib/seo";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const suggestions = [
  { href: "/admissions", label: "Admissions", icon: "how_to_reg" },
  { href: "/programs", label: "Programs", icon: "auto_stories" },
  { href: "/campus-life", label: "Campus Life", icon: "diversity_3" },
  { href: "/contact", label: "Contact", icon: "call" },
];

export default async function NotFound() {
  const [school, brand] = await Promise.all([getContact(), getBrandName()]);
  return (
    <>
      <div className="bg-geo pointer-events-none fixed inset-0 z-0 opacity-60" aria-hidden />
      <div className="relative z-10">
        <Header name={brand} branch="" />
        <main className="py-24 sm:py-32">
          <Container className="max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-deep ring-1 ring-gold/30">
              <Icon name="explore_off" className="text-base" />
              404
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl">This page has wandered off.</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">
              The link may be old or mistyped. Here are the pages parents look for most.
            </p>

            <ul className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-3">
              {suggestions.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="flex items-center gap-2.5 rounded-2xl border border-emerald/10 bg-white/80 px-4 py-3.5 text-sm font-semibold text-emerald-deep shadow-soft transition hover:border-emerald/30"
                  >
                    <Icon name={s.icon} className="text-[20px] text-gold" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button href="/">Back to home</Button>
              <a href={`tel:${school.phoneE164}`} className="text-sm font-semibold text-emerald-deep">
                Or call {school.phone}
              </a>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    </>
  );
}
