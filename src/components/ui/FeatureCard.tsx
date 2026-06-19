import { Icon } from "./Icon";
export function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-xl2 border border-emerald/10 bg-white p-7">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald/5 text-emerald">
        <Icon name={icon} />
      </span>
      <h3 className="mt-5 text-xl text-emerald">{title}</h3>
      <p className="mt-2 text-ink/70">{body}</p>
    </div>
  );
}
