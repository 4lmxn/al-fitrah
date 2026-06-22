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
    body: "To provide the best Islamic and academic foundation, seamlessly integrating rigorous modern education with profound spiritual nurturing so our students excel in both Deen and Dunya.",
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
    title: "Our sanctuary",
    lines: ["3rd Floor, Vivian Complex", "Opp HP Petrol Bunk, Sompura Gate", "Sarjapura, Bengaluru 562125"],
    image: "/images/map.png",
    imageAlt: "Map of the Al Fitrah campus location in Sarjapura",
  },
};

export const programs: ProgramsPage = {
  hero: {
    eyebrow: "Nurturing the innate goodness",
    title: "A 3-year integrated program.",
    subtitle:
      "A holistic journey that balances rigorous academic foundations with deep spiritual nurturing, preparing your child for both this world and the hereafter.",
    stats: [
      { icon: "child_care", label: "Age group", value: "2.10 – 3.10 yrs" },
      { icon: "schedule", label: "Duration", value: "3 years" },
    ],
  },
  curriculum: {
    title: "A comprehensive curriculum",
    subtitle: "The Oxford Early Learning Curriculum blended with the Noor-ul-Bayan Islamic system, delivered in a sanctuary of learning.",
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
    image: "/images/musalla.png",
    imageAlt: "A serene prayer hall with soft light, illustrated",
    imageCaption: "Nurturing a lifelong love for learning.",
  },
  outcomes: {
    eyebrow: "By the end of 3 years",
    title: "Program outcomes",
    quote: "Read the Qur'an fluently and memorize up to 2 Juz, with a strong Arabic and academic foundation.",
    body: "By completion, In Sha Allah, students read the Qur'an fluently, grasp basic Tajweed, Aqeedah and Hadith, and are academically prepared for Grade 1 of any recognized school — grounded in faith for life.",
    cta: { label: "View full syllabus", href: "/syllabus", variant: "primary" },
    image: "/images/classroom.png",
    imageAlt: "Children learning together in a bright classroom, illustrated",
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
      { icon: "tour", title: "Campus tour", body: "We'll schedule a visit so you can experience our nurturing environment." },
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
      "A sanctuary for growth, learning, and spiritual connection. Every moment of the Al Fitrah day is designed to nurture the goodness within.",
  },
  gallery: [
    { title: "Engaged minds", caption: "Hands-on, play-based discovery", image: "/images/campus-engaged.png" },
    { title: "Serene rhythm", caption: "A calm, prayerful flow", image: "/images/musalla.png" },
    { title: "Joyful play", caption: "Room to move and imagine", image: "/images/campus-play.png" },
    { title: "Nurturing spaces", caption: "Warm, welcoming rooms", image: "/images/campus-spaces.png" },
    { title: "Creative expression", caption: "Art, colour, and craft", image: "/images/campus-creative.png" },
    { title: "Community", caption: "Belonging in every circle", image: "/images/campus-community.png" },
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
        { q: "What are the school hours?", a: "Monday to Friday, 8:30 AM to 3:30 PM, and Saturday, 9:00 AM to 12:30 PM. We are closed on Sundays and public holidays." },
        { q: "Do you provide meals?", a: "We share a weekly halal lunch menu designed for growing children, with information on nutrition and dietary accommodations." },
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
    subtitle: "Everything you need to stay connected with your child's journey, from academic calendars to daily nutrition, curated for our community.",
  },
  resources: [
    { icon: "event", title: "Academic calendar", body: "Important dates, holidays, parent-teacher conferences, and community events for the school year.", action: "View schedule", large: true },
    { icon: "nutrition", title: "Lunch menu", body: "Weekly halal meals designed for growing minds, with nutrition and dietary information.", action: "Download menu" },
    { icon: "styler", title: "Uniform guidelines", body: "Modest, comfortable attire requirements.", action: "Read more" },
    { icon: "menu_book", title: "Parent handbook", body: "Policies, procedures, and core values.", action: "Read more" },
    { icon: "volunteer_activism", title: "Get involved", body: "Volunteer opportunities for parents.", action: "Read more" },
  ],
  testimonials: {
    title: "Voices from our community",
    subtitle: "How Al Fitrah is nurturing the innate goodness within families across our community.",
    items: [
      { author: "Aisha M.", relation: "Parent of a Pre-KG student", quote: "The balance between a strong academic foundation and spiritual grounding is exceptional. I feel truly partnered with the teachers." },
      { author: "Omar K.", relation: "Parent of a Senior KG student", quote: "The transparency gives us peace of mind. Seeing the halal menu and daily schedule helps us reinforce lessons at home." },
      { author: "Sarah & Tariq", relation: "Al Fitrah parents", quote: "Clear expectations from day one. A professional, beautifully organized system that respects our time as parents." },
    ],
  },
};

export const contact: ContactPage = {
  hero: {
    eyebrow: "Get in touch",
    title: "We'd love to hear from you.",
    subtitle: "Reach out to learn more about our nurturing environment rooted in Fitrah and academic excellence.",
  },
  details: {
    address: ["3rd Floor, Vivian Complex", "Opp HP Petrol Bunk, Sompura Gate", "Sarjapura 562125"],
    phones: ["+91 99865 00718", "+91 99860 49413"],
    email: "alfitrah.sompura@gmail.com",
  },
  image: "/images/map.png",
  imageAlt: "Map showing the Al Fitrah campus near Sompura Gate, Sarjapura",
  hours: {
    title: "Visit us",
    rows: [
      { label: "Monday – Friday", value: "8:30 AM – 3:30 PM" },
      { label: "Saturday", value: "9:00 AM – 12:30 PM" },
    ],
    note: "Closed on Sundays and public holidays. Appointments recommended for campus tours.",
  },
};
