import type { Home } from "./types";

export const home: Home = {
  hero: {
    eyebrow: "Admissions open for 2026-27",
    title: "A strong foundation for Deen and Dunya.",
    rainbow: ["Deen", "Dunya"],
    subtitle:
      "Al Fitrah blends the Oxford Early Learning Curriculum with the Noor-ul-Bayan Qur'anic method in a warm, faith-centred three-year program for young children.",
    cta: { label: "Begin your child's path", href: "/admissions", variant: "primary" },
    image: "/images/real/entrance-wide.jpg",
    imageAlt: "The bright, welcoming entrance of Al Fitrah Pre School with a 'Welcome Back to School' board",
    badge: "3-year program · Faith-first",
    chips: [
      { icon: "mosque", label: "Deen woven into every day" },
      { icon: "schedule", label: "9:00 AM - 1:30 PM" },
      { icon: "menu_book", label: "Qur'an & Tajweed" },
    ],
  },
  stats: [
    { value: 3, suffix: "yr", label: "Continuous program" },
    { value: 2, label: "Trusted curricula" },
    { value: 3, label: "Levels, Pre-KG to Senior KG" },
  ],
  quickFacts: [
    { icon: "child_care", label: "Entry age", value: "2y10m - 3y10m" },
    { icon: "schedule", label: "Program", value: "3 years" },
    { icon: "school", label: "Academics", value: "Oxford Early Learning" },
    { icon: "verified", label: "Qur'an", value: "Noor-ul-Bayan" },
  ],
  approach: {
    eyebrow: "Our approach",
    title: "Where young minds, character, and faith grow together.",
    rainbow: ["faith"],
    subtitle: "Three gentle threads woven through every single day, so mind, heart, and Deen grow side by side.",
    items: [
      { icon: "school", title: "Integrated 3-year program", body: "A continuous journey through Pre-KG, Junior KG, and Senior KG, blending the Oxford Early Learning Curriculum with gentle Islamic guidance throughout the day." },
      { icon: "menu_book", title: "Qur'an & Tajweed", body: "The Noor-ul-Bayan System builds Qur'an reading, fluency, and Tajweed from an early age, woven softly into the daily rhythm." },
      { icon: "volunteer_activism", title: "Character & Deen", body: "Aqeedah, Hadith, daily Du'as, and Islamic manners nurtured through everyday play and practice." },
    ],
  },
  highlights: {
    eyebrow: "Campus life",
    title: "A little joy, every single day.",
    rainbow: ["joy"],
    subtitle: "Joyful play spaces, bright classrooms, and a warm welcome, a place little ones love running into each morning.",
    tiles: [
      { title: "Joyful play", caption: "Room to move, build, and imagine", image: "/images/real/play-room.jpg" },
      { title: "Bright classrooms", caption: "Clean, glass-fronted learning rooms", image: "/images/real/classroom.jpg" },
      { title: "Soft, safe play", caption: "Cushioned floors for our littlest learners", image: "/images/real/soft-play.jpg" },
      { title: "A warm welcome", caption: "Every child greeted with care", image: "/images/real/welcome-board.jpg" },
    ],
  },
  welcome: {
    eyebrow: "Assalamu alaikum",
    title: "A warm welcome from Al Fitrah.",
    body: [
      "Every child arrives with a pure, natural disposition, their fitrah. Our role is to protect and nurture it: to let curiosity lead, to weave faith gently through the day, and to help each child grow kind, confident, and connected.",
      "We would love to welcome your family to our home and show you how learning and Deen grow together here.",
    ],
    by: "The Al Fitrah Team",
    role: "Sompura, Sarjapura",
  },
  seats: {
    title: "Limited seats available",
    subtitle:
      "Register your interest for 2026-27 and give your child a three-year start that pairs strong academics with a grounded Islamic upbringing.",
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
