export type KeyFact = { icon: string; label: string; value: string };
export type Teacher = { name: string; role: string; credentials: string; image?: string };
export type FeeRow = { label: string; amount: string; note?: string };
export type DayBlock = { time: string; title: string; body: string };
export type Step = { icon: string; title: string; body: string };
export type Policy = { icon: string; title: string; body: string };

export type SchoolFacts = {
  keyFacts: KeyFact[];

  fees: {
    intro: string;
    rows: FeeRow[];
    footnote: string;
  } | null;

  teachers: Teacher[];

  day: DayBlock[];

  settlingIn: Step[];

  safety: Policy[];

  communication: Policy[];

  health: Policy[];
};

export const facts: SchoolFacts = {
  keyFacts: [],
  fees: null,
  teachers: [],
  day: [],
  settlingIn: [],
  safety: [],
  communication: [],
  health: [],
};
