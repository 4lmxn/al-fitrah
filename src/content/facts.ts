/**
 * Facts only the school can supply.
 *
 * Parents choose a preschool on specifics — ratio, fees, safety, who the
 * teachers are, what the first two weeks look like. Adjectives ("warm",
 * "nurturing") are what every competitor writes, so they persuade nobody.
 *
 * Everything in this file starts empty, and every section that depends on a
 * value renders NOTHING until that value is filled. That is the whole point:
 * the site can never show a placeholder, a "TBD", or an invented number. Fill a
 * value here and the section appears on its own.
 *
 * `docs/school-facts-needed.md` is the same list written for the school to
 * answer. When answers come back, they get typed in here — nowhere else.
 */

export type KeyFact = { icon: string; label: string; value: string };
export type Teacher = { name: string; role: string; credentials: string; image?: string };
export type FeeRow = { label: string; amount: string; note?: string };
export type DayBlock = { time: string; title: string; body: string };
export type Step = { icon: string; title: string; body: string };
export type Policy = { icon: string; title: string; body: string };

export type SchoolFacts = {
  /**
   * Headline numbers for the "By the numbers" strip. A top-three factor in
   * every parent survey, and currently the loudest silence on the site.
   * Example: { icon: "groups", label: "Teacher to child", value: "1:10" }
   */
  keyFacts: KeyFact[];

  /**
   * Fee schedule. The single biggest drop-off point: a parent who cannot find
   * a price does not enquire to discover it, they close the tab.
   * `note` carries anything conditional (sibling discount, one-time charges).
   */
  fees: {
    intro: string;
    rows: FeeRow[];
    /** Small print under the table — instalment dates, what is not included. */
    footnote: string;
  } | null;

  /** Named teachers with real credentials. "Guided by experts" persuades nobody. */
  teachers: Teacher[];

  /**
   * The actual timetable, with clock times. "Morning arrival & circle" tells a
   * parent nothing; "9:00 Arrival and free play" tells them everything.
   */
  day: DayBlock[];

  /** What happens in a new child's first two weeks. The #1 fear at 2y10m. */
  settlingIn: Step[];

  /** Pickup authorisation, emergency procedure, hygiene, premises security. */
  safety: Policy[];

  /** How and how often families hear from the school. */
  communication: Policy[];

  /** Snacks, allergies, sick-child policy. */
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
