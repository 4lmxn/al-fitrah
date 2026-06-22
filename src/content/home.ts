import type { Home } from "./types";

export const home: Home = {
  hero: {
    eyebrow: "Admissions open for 2026–27",
    title: "A strong foundation for Deen and Dunya.",
    subtitle:
      "Al Fitrah blends the Oxford Early Learning Curriculum with the Noor-ul-Bayan Qur'anic method in a warm, faith-centred three-year program for young children.",
    cta: { label: "Begin your child's path", href: "/admissions", variant: "primary" },
    image: "/images/classroom.png",
    imageAlt: "Children exploring a bright Al Fitrah classroom, illustrated",
    badge: "3-year program · Faith-first",
  },
  quickFacts: [
    { icon: "child_care", label: "Entry age", value: "2y10m – 3y10m" },
    { icon: "schedule", label: "Program", value: "3 years" },
    { icon: "school", label: "Academics", value: "Oxford Early Learning" },
    { icon: "verified", label: "Qur'an", value: "Noor-ul-Bayan" },
  ],
  approach: {
    eyebrow: "Our approach",
    title: "Where young minds, character, and faith grow together.",
    items: [
      { icon: "school", title: "Integrated 3-year program", body: "A continuous journey — Pre-KG, Junior KG, Senior KG — blending the Oxford Early Learning Curriculum with gentle Islamic guidance throughout the day." },
      { icon: "menu_book", title: "Qur'an & Tajweed", body: "The Noor-ul-Bayan System builds Qur'an reading, fluency, and Tajweed from an early age, woven softly into the daily rhythm." },
      { icon: "volunteer_activism", title: "Character & Deen", body: "Aqeedah, Hadith, daily Du'as, and Islamic manners nurtured through everyday play and practice." },
    ],
  },
  highlights: [
    { title: "Engaged minds", caption: "Hands-on, play-based discovery", image: "/images/campus-engaged.png" },
    { title: "Serene rhythm", caption: "A calm, prayerful daily flow", image: "/images/musalla.png" },
    { title: "Joyful play", caption: "Room to move, build, and imagine", image: "/images/campus-play.png" },
    { title: "Circle time", caption: "Stories, songs, and belonging", image: "/images/circle-time.png" },
  ],
  welcome: {
    eyebrow: "Assalamu alaikum",
    title: "A warm welcome from Al Fitrah.",
    body: [
      "Every child arrives with a pure, natural disposition — their fitrah. Our role is to protect and nurture it: to let curiosity lead, to weave faith gently through the day, and to help each child grow kind, confident, and connected.",
      "We would love to welcome your family to our home and show you how learning and Deen grow together here.",
    ],
    by: "The Al Fitrah Team",
    role: "Sompura, Sarjapura",
  },
  testimonials: {
    title: "Trusted by our families",
    subtitle: "What parents say about the Al Fitrah experience.",
    items: [
      { author: "Aisha M.", relation: "Parent of a Pre-KG student", quote: "The balance between a strong academic foundation and spiritual grounding is exceptional. I feel truly partnered with the teachers." },
      { author: "Omar K.", relation: "Parent of a Senior KG student", quote: "The transparency gives us peace of mind. Seeing the daily rhythm helps us reinforce lessons at home." },
      { author: "Sarah & Tariq", relation: "Al Fitrah parents", quote: "Clear expectations from day one. A professional, beautifully organized system that respects our time." },
    ],
  },
  seats: {
    title: "Limited seats available",
    subtitle:
      "Join the Al Fitrah family and give your child a three-year foundation that balances academic excellence with timeless spiritual wisdom.",
    cta: { label: "Enroll today", href: "/admissions#enroll", variant: "gold" },
  },
  contact: {
    title: "Come and see us",
    subtitle: "We'd love to welcome your family for a visit and a conversation about your child.",
    address: "3rd Floor, Vivian Complex, Opp HP Petrol Bunk, Sompura Gate, Sarjapura, Bengaluru 562125",
    phone: "+91 99865 00718",
    email: "alfitrah.sompura@gmail.com",
    image: "/images/map.png",
    imageAlt: "Map showing the Al Fitrah campus location in Sarjapura",
  },
};
