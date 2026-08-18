// One key word per heading gets its letters cycled through the palette. Brand
// colours lead the cycle — emerald and gold first — with the playful accents
// filling out the rest, so the effect reads as Al Fitrah rather than as generic
// confetti.
//
// The coloured letters are aria-hidden and a plain copy of the word is exposed
// to screen readers: a run of one-character spans otherwise gets announced
// letter by letter by some readers.
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

/**
 * Colours one or more whole words inside a heading. Words are matched
 * literally; anything not found is simply left alone, so a copy edit can never
 * break a heading. Each word restarts the cycle, so every highlighted word
 * opens on the brand emerald.
 */
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
