const CYCLE = [
  "text-emerald",
  "text-gold",
  "text-coral",
  "text-grape",
  "text-sky",
  "text-leaf",
] as const;

export function Rainbow({ children }: { children: string }) {
  let i = 0;
  return (
    <>
      <span className="sr-only">{children}</span>
      <span aria-hidden>
        {[...children].map((ch, idx) =>
          ch.trim() === "" ? (
            <span key={idx}> </span>
          ) : (
            <span key={idx} className={CYCLE[i++ % CYCLE.length]}>
              {ch}
            </span>
          )
        )}
      </span>
    </>
  );
}

export function RainbowWords({ text, words }: { text: string; words?: string[] }) {
  if (!words?.length) return <>{text}</>;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        words.includes(part) ? <Rainbow key={i}>{part}</Rainbow> : <span key={i}>{part}</span>
      )}
    </>
  );
}
