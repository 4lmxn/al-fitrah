import type { Home } from "./types";
export const home: Home = {
  hero: {
    eyebrow: "Islamic Pre-School · Ages 2–6",
    title: "A nurturing place where faith and curiosity grow together.",
    subtitle:
      "Al Fitrah blends Montessori-inspired learning with Islamic values in a warm, modern environment.",
    ctas: [
      { label: "Apply for Admission", href: "/admissions", variant: "primary" },
      { label: "Explore Programs", href: "/programs", variant: "outline" },
    ],
  },
  quickFacts: [
    { label: "Ages", value: "2–6 yrs" },
    { label: "Class size", value: "≤ 12" },
    { label: "Approach", value: "Montessori" },
    { label: "Values", value: "Faith-first" },
  ],
  whyUs: [
    { title: "Faith-centered", body: "Daily Islamic values woven gently into play and routine." },
    { title: "Small classes", body: "Low ratios so every child is seen, heard, and nurtured." },
    { title: "Whole-child", body: "Cognitive, social, emotional, and spiritual growth together." },
  ],
  programs: [
    { ageGroup: "2–3 yrs", title: "Toddler", description: "Gentle first steps into structured play." },
    { ageGroup: "3–4 yrs", title: "Nursery", description: "Language, motor skills, and early Deen." },
    { ageGroup: "4–6 yrs", title: "Kindergarten", description: "Pre-literacy, numeracy, and Quran basics." },
  ],
};
