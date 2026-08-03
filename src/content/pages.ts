import type {
  AboutPage, ProgramsPage, AdmissionsPage, CampusPage, FaqPage, ParentPage, ContactPage,
} from "./types";

export const about: AboutPage = {
  hero: {
    eyebrow: "Our story",
    title: "Nurturing the innate goodness in every child.",
    subtitle:
      "We believe every child is born with a natural capacity for learning, compassion, and connection. Al Fitrah is the environment for that nature to flourish.",
  },
  mission: {
    title: "Our mission",
    body: "To give children a strong start in both Deen and Dunya — a modern academic foundation taught alongside everyday Islamic learning, with care and patience.",
  },
  vision: {
    title: "Holistic growth",
    body: "Developing mind, body, and soul together in a calm, nurturing environment.",
  },
  team: {
    title: "Guided by experts",
    subtitle: "Our educators are the heart of Al Fitrah, dedicated to academic excellence and moral character.",
    image: "/images/circle-time.png",
    imageAlt: "An Al Fitrah teacher leading circle time with children, illustrated",
    points: [
      { icon: "verified", title: "Authentic Qur'anic method", body: "Our teaching is rooted in the Noor-ul-Bayan System — developed in Egypt and delivered in India through Anjuman Taleemul Qur'an, Calicut, with whom Al Fitrah is proudly affiliated." },
      { icon: "favorite", title: "Nurturing methodology", body: "We pair the Oxford Early Learning Curriculum with Islamic values, treating every child with respect and empathy to build calm confidence." },
    ],
  },
  location: {
    eyebrow: "Visit us",
    title: "Where we are",
    lines: ["3rd Floor, Vivian Complex", "Opp HP Petrol Bunk, Sompura Gate", "Sarjapura, Bengaluru 562125"],
    image: "/images/real/lobby.jpg",
    imageAlt: "The welcoming reception area at Al Fitrah Pre School, Sarjapura",
  },
};

export const programs: ProgramsPage = {
  hero: {
    eyebrow: "Our programme",
    title: "A 3-year integrated program.",
    subtitle:
      "Three years that pair a solid academic foundation with daily Qur'an and Islamic learning — preparing your child for school, and for life.",
    stats: [
      { icon: "child_care", label: "Age group", value: "2.10 – 3.10 yrs" },
      { icon: "schedule", label: "Duration", value: "3 years" },
    ],
  },
  curriculum: {
    title: "A comprehensive curriculum",
    subtitle: "The Oxford Early Learning Curriculum alongside the Noor-ul-Bayan method for Qur'an and Arabic.",
    quran: {
      title: "Islamic curriculum · Noor-ul-Bayan",
      items: [
        { label: "Qur'an & Tajweed", body: "Qur'an reading, fluency, and the rules of recitation, built gradually from an early age." },
        { label: "Arabic foundations", body: "Letter recognition, joining, and reading using the Noor-ul-Bayan method." },
        { label: "Aqeedah & Hadith", body: "Islamic beliefs, Hadith, daily Du'as, and Islamic manners woven through the day." },
      ],
    },
    modern: [
      { icon: "language", title: "English", body: "Phonics, vocabulary, and early reading & writing readiness." },
      { icon: "calculate", title: "Mathematics", body: "Numbers, counting, patterns, shapes, and logical thinking." },
      { icon: "public", title: "Environmental studies", body: "The world around us, nature, community, health, and hygiene." },
    ],
    spiritual: {
      title: "Learning through play",
      tags: ["Hands-on", "Storytelling", "Art & craft"],
      body: "Children learn best when engaged — sensory play, role play, and group activities build confidence, curiosity, and social skills.",
    },
    image: "/images/real/classroom.jpg",
    imageAlt: "A bright, glass-fronted classroom at Al Fitrah with soft play equipment",
    imageCaption: "Nurturing a lifelong love for learning.",
  },
  outcomes: {
    eyebrow: "By the end of 3 years",
    title: "Program outcomes",
    quote: "Read the Qur'an fluently and memorize up to 2 Juz, with a strong Arabic and academic foundation.",
    body: "By completion, In Sha Allah, students read the Qur'an fluently, grasp basic Tajweed, Aqeedah and Hadith, and are academically prepared for Grade 1 of any recognized school — grounded in faith for life.",
    cta: { label: "View full syllabus", href: "/syllabus", variant: "primary" },
    image: "/images/real/welcome-board.jpg",
    imageAlt: "A colourful 'Welcome Back to School' board at Al Fitrah Pre School",
  },
};

export const admissions: AdmissionsPage = {
  hero: {
    eyebrow: "Admissions 2026–27",
    title: "Secure your child's place.",
    subtitle:
      "Admissions are at the Pre-KG entry level for children aged 2 years 10 months to 3 years 10 months. The process is clear, supportive, and welcoming to every family.",
  },
  process: {
    title: "Admissions process",
    steps: [
      { icon: "edit_note", title: "Submit inquiry", body: "Fill out the form to express interest and share a few basic details." },
      { icon: "tour", title: "Campus visit", body: "Drop by during school hours (9:00 AM – 1:30 PM) to experience our nurturing environment." },
      { icon: "groups", title: "Interaction", body: "A brief, friendly meeting to understand your child's needs." },
      { icon: "verified", title: "Enrollment", body: "Complete the paperwork and secure your child's spot." },
    ],
  },
  assist: {
    title: "Need assistance?",
    phones: ["+91 99865 00718", "+91 99860 49413"],
    email: "alfitrah.sompura@gmail.com",
  },
  form: {
    title: "Admissions inquiry form",
    subtitle: "Share the details below and our admissions team will contact you shortly.",
    note: "By submitting, you agree to our privacy policy. We respect your data.",
  },
};

export const campus: CampusPage = {
  hero: {
    eyebrow: "Campus life",
    title: "A calm, joyful daily rhythm.",
    subtitle:
      "A calm, structured day built around learning, play, and Qur'an — with room for every child to grow at their own pace.",
  },
  gallery: [
    { title: "A warm welcome", caption: "Our bright, welcoming entrance", image: "/images/real/entrance-wide.jpg" },
    { title: "Joyful play", caption: "Room to move, slide, and imagine", image: "/images/real/play-room.jpg" },
    { title: "Soft, safe play", caption: "Cushioned floors and a ball pit", image: "/images/real/ball-pit.jpg" },
    { title: "Bright classrooms", caption: "Clean, glass-fronted learning rooms", image: "/images/real/classroom.jpg" },
    { title: "Creative corners", caption: "Slides, easels, and play stations", image: "/images/real/soft-play.jpg" },
    { title: "Calm, clean spaces", caption: "A tidy, peaceful campus", image: "/images/real/corridor.jpg" },
  ],
  rhythm: {
    title: "The daily rhythm",
    subtitle: "A structured yet flexible flow that balances academic focus, spiritual connection, and play.",
    items: [
      { icon: "wb_sunny", title: "Morning arrival & circle", body: "We begin with peaceful intention, welcoming each child with morning Du'as and collaborative circle time." },
      { icon: "explore", title: "Focused learning & Qur'an", body: "Oxford Early Learning periods interwoven with Qur'an (Noor-ul-Bayan) and guided memorization in a calm environment." },
      { icon: "nature_people", title: "Outdoor play & dismissal", body: "Gross-motor development in our play areas, followed by afternoon reflections before home." },
    ],
  },
};

export const faq: FaqPage = {
  hero: {
    eyebrow: "Help centre",
    title: "Frequently asked questions.",
    subtitle: "Answers to common questions about our admissions process, holistic curriculum, and daily life at Al Fitrah.",
  },
  groups: [
    {
      id: "admissions", icon: "assignment", category: "Admissions process",
      items: [
        { q: "What is the ideal age to enroll my child?", a: "Admissions are at our Pre-KG entry level for children aged 2 years 10 months to 3 years 10 months. The program is a continuous three-year journey — Pre-KG, Junior KG, then Senior KG — so we do not offer direct entry into Junior or Senior KG." },
        { q: "Do you require an assessment or interview prior to admission?", a: "We hold a brief, friendly interaction with the child and family. It is not a formal test, but a chance to understand your child's needs and ensure our philosophy aligns with your family's values." },
      ],
    },
    {
      id: "islamic", icon: "menu_book", category: "Islamic curriculum (Noor-ul-Bayan)",
      items: [
        { q: "How is the Qur'an taught at Al Fitrah?", a: "Through the Noor-ul-Bayan System, children build Qur'an reading, fluency, and Tajweed, and memorize up to 2 Juz of selected Surahs across the three years — integrated into the daily rhythm alongside Aqeedah, Hadith, and Du'as, not as a separate intensive track." },
        { q: "Does my child need prior Arabic knowledge to join?", a: "No prior knowledge is required. The Noor-ul-Bayan method starts from the foundations and supports every child individually, so each progresses at their own pace." },
      ],
    },
    {
      id: "fees", icon: "payments", category: "Fees & scholarships",
      items: [
        { q: "Are scholarships or fee concessions available?", a: "We offer need-based concessions for eligible families. Please reach out to our admissions team to discuss your circumstances in confidence." },
        { q: "How are fees structured through the year?", a: "Fees can be paid in convenient instalments across the academic year. The admissions team will share the full schedule during enrollment." },
      ],
    },
    {
      id: "schedule", icon: "schedule", category: "Daily schedule",
      items: [
        { q: "What are the school hours?", a: "School runs from 9:00 AM to 1:30 PM. You're welcome to visit during these hours to see the campus and meet our team." },
        { q: "Do you provide meals?", a: "We don't have a canteen or cafeteria, so children bring their own food from home for snack and lunch." },
      ],
    },
  ],
  cta: {
    title: "Still have questions?",
    body: "Our admissions team is here to guide you through every step. We welcome you to reach out directly.",
    cta: { label: "Contact admissions", href: "/contact", variant: "gold" },
  },
};

export const parent: ParentPage = {
  hero: {
    eyebrow: "Family gateway",
    title: "Parent resources.",
    subtitle: "Everything you need to stay connected with your child's journey, from academic calendars to uniform guidelines, curated for our community.",
  },
  resources: [
    { icon: "event", title: "Academic calendar", body: "Holidays, assessments, parent meetings, and celebrations for 2026–27 — see the full year below.", action: "See dates below", large: true },
    { icon: "styler", title: "Uniform guidelines", body: "Modest, comfortable attire requirements.", action: "Read more" },
    { icon: "menu_book", title: "Parent handbook", body: "Policies, procedures, and core values.", action: "Read more" },
    { icon: "volunteer_activism", title: "Get involved", body: "Volunteer opportunities for parents.", action: "Read more" },
  ],
  academicCalendar: {
    title: "Academic Year 2026–27",
    subtitle: "The key dates families need through the year. A few dates are tentative and may shift slightly — we'll always confirm ahead of time.",
    note: "Returning students reopen on 3 June 2026. Pre-KG (Beginners) orientation is 6 June, with classes from 8 June.",
    groups: [
      {
        icon: "celebration",
        title: "Celebrations & special days",
        items: [
          "Red Day — 25 Jun",
          "Green Day — 9 Jul",
          "Fruit Day — 23 Jul",
          "Independence Day celebration — 14 Aug",
          "Blue Day — 10 Sep",
          "School picnic — 15 Oct",
          "Professions Day — 5 Nov",
          "Sports Day — 28 Nov",
          "Yellow Day — 3 Dec",
          "Number Day — 7 Jan",
          "Annual Day — 30 Jan (tentative)",
        ],
      },
      {
        icon: "fact_check",
        title: "Assessments & parent meetings",
        items: [
          "Assessment 1 — 16–24 Sep",
          "PTM 1 — 26 Sep",
          "Assessment 2 — 10–18 Dec",
          "PTM 2 — 2 Jan",
          "Assessment 3 — 17–25 Mar",
          "PTM 3 — 27 Mar",
        ],
      },
      {
        icon: "beach_access",
        title: "Breaks & vacations",
        items: [
          "Winter break — 24–29 Dec (reopens 30 Dec)",
          "Ramadan & Eid break — 1–14 Mar (reopens 15 Mar)",
          "Last working day — 31 Mar (tentative)",
          "Summer vacation — 1 Apr – 31 May",
        ],
      },
      {
        icon: "event_busy",
        title: "Public holidays",
        items: [
          "Muharram — 26 Jun",
          "Independence Day — 15 Aug",
          "Ganesh Chaturthi — 14 Sep",
          "Gandhi Jayanti — 2 Oct",
          "Dussehra — 19–21 Oct",
          "Diwali — 9 Nov",
          "Sankranti — 15 Jan",
          "Republic Day — 26 Jan",
        ],
      },
    ],
  },
};

export const contact: ContactPage = {
  hero: {
    eyebrow: "Get in touch",
    title: "We'd love to hear from you.",
    subtitle: "Have a question about admissions or want to arrange a visit? We're happy to help.",
  },
  details: {
    // Keep in sync with FULL_ADDRESS in src/lib/seo.ts (single source of address truth).
    address: ["3rd Floor, Vivian Complex", "Opp HP Petrol Bunk, Sompura Gate", "Sarjapura, Bengaluru, Karnataka 562125"],
    phones: ["+91 99865 00718", "+91 99860 49413"],
    email: "alfitrah.sompura@gmail.com",
  },
  image: "/images/map.png",
  imageAlt: "Map showing the Al Fitrah campus near Sompura Gate, Sarjapura",
  hours: {
    title: "Visit us",
    rows: [
      { label: "School hours", value: "9:00 AM – 1:30 PM" },
      { label: "Campus visits", value: "Walk in during school hours" },
    ],
    note: "You're welcome to visit during school hours — no appointment needed. Feel free to call or message ahead if you'd like.",
  },
};
