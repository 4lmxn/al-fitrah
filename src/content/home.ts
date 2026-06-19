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
  quickFacts: [
    { icon: "child_care", label: "Ages", value: "2 – 6 years" },
    { icon: "groups", label: "Small classes", value: "Low ratios" },
    { icon: "school", label: "Approach", value: "Montessori" },
    { icon: "verified", label: "Certified", value: "Noor-el-bayan" },
  ],
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
      { author: "Aisha M.", relation: "Parent of a nursery student", quote: "The balance between rigorous academics and spiritual grounding is exceptional. I feel truly partnered with the teachers." },
      { author: "Omar K.", relation: "Parent of a kindergartener", quote: "The transparency gives us peace of mind. Seeing the daily schedule helps us reinforce lessons at home." },
      { author: "Sarah & Tariq", relation: "Hifz program parents", quote: "Clear expectations from day one. A professional, beautifully organized system that respects our time." },
    ],
  },
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
