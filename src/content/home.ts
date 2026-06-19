import type { Home } from "./types";

export const home: Home = {
  hero: {
    eyebrow: "Admissions open for 2026–27",
    title: "A nurturing start, rooted in faith and curiosity.",
    subtitle:
      "Al Fitrah blends Montessori-inspired learning with Islamic values in a warm, modern home for ages 2 to 6.",
    cta: { label: "Begin your child's path", href: "/admissions", variant: "primary" },
    image: "/images/classroom.png",
    imageAlt: "Children exploring a bright Al Fitrah classroom, illustrated",
    badge: "Small classes · Faith-first",
  },
  approach: {
    eyebrow: "Our approach",
    title: "Where young minds, character, and faith grow together.",
    items: [
      { icon: "school", title: "Integrated program", body: "A connected curriculum blending early-years learning with gentle Islamic guidance throughout the day." },
      { icon: "menu_book", title: "Quran & Tajweed", body: "Age-appropriate introduction to the Quran and correct recitation, woven softly into daily rhythm." },
      { icon: "volunteer_activism", title: "Character building", body: "Nurturing good manners, empathy, and confidence through everyday play and practice." },
    ],
  },
  highlights: [
    { title: "Engaged minds", caption: "Hands-on Montessori discovery", image: "/images/campus-engaged.png" },
    { title: "Serene rhythm", caption: "A calm, prayerful daily flow", image: "/images/musalla.png" },
    { title: "Joyful play", caption: "Room to move, build, and imagine", image: "/images/campus-play.png" },
    { title: "Circle time", caption: "Stories, songs, and belonging", image: "/images/circle-time.png" },
  ],
  seats: {
    title: "Limited seats available",
    subtitle:
      "Join the Al Fitrah family and give your child an education that balances modern excellence with timeless spiritual wisdom.",
    cta: { label: "Enroll today", href: "/admissions", variant: "gold" },
  },
  contact: {
    title: "Come and see us",
    subtitle: "We'd love to welcome your family for a visit and a conversation about your child.",
    address: "3rd Floor, Vivian Complex, Opp HP Petrol Bunk, Sompura Gate, Sarjapura 562125",
    phone: "+91 99995 00718",
    email: "alfitrah.sompura@gmail.com",
    image: "/images/map.png",
    imageAlt: "Map showing the Al Fitrah campus location in Sarjapura",
  },
};
