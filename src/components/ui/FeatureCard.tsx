import { Icon } from "./Icon";

export function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="group relative h-full overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
        <Icon name={icon} className="text-[28px]" />
      </span>
      <h3 className="mt-6 text-2xl text-emerald-deep">{title}</h3>
      <p className="mt-3 leading-relaxed text-ink/70">{body}</p>
    </div>
  );
}
