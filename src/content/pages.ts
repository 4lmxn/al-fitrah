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
      { icon: "verified", title: "Certified excellence", body: "Our teaching staff are qualified professionals approved by Noor-el-bayan, Egypt, ensuring an authentic, deeply rooted approach to Arabic and Quranic studies." },
      { icon: "favorite", title: "Nurturing methodology", body: "We pair modern, child-centric pedagogy with Islamic values, treating every child with respect and empathy to build calm confidence." },
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
    subtitle: "Essential modern subjects blended with core Islamic teachings, delivered in a sanctuary of learning.",
    quran: {
      title: "Arabic & Qur'an",
      items: [
        { label: "Tajweed", body: "Perfecting pronunciation and the art of recitation from an early age." },
        { label: "Recitation", body: "Fostering a deep love and connection with the words of Allah." },
      ],
    },
    modern: [
      { icon: "calculate", title: "Mathematics", body: "Building logical foundations." },
      { icon: "language", title: "English", body: "Confident communication." },
    ],
    spiritual: {
      title: "Spiritual rhythm",
      tags: ["Hadith", "Dhikr", "Dua"],
      body: "Integrating daily remembrance and the teachings of the Prophet (ﷺ) into routine.",
    },
    image: "/images/musalla.png",
    imageAlt: "A serene prayer hall with soft light, illustrated",
    imageCaption: "Nurturing a lifelong love for learning.",
  },
  outcomes: {
    eyebrow: "By the end of 3 years",
    title: "Program outcomes",
    quote: "Khatmul Qur'an recitation and memorization of 2 Juz with Tajweed.",
    body: "Our dedicated educators ensure each child progresses at their own natural pace while reaching remarkable milestones in both academic and spiritual disciplines.",
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
      "Begin a journey of holistic education rooted in natural goodness. Our process is clear, supportive, and welcoming to every family.",
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
    { title: "Engaged minds", caption: "Hands-on Montessori discovery", image: "/images/campus-engaged.png" },
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
      { icon: "explore", title: "Focused work & Hifz", body: "Uninterrupted Montessori work periods interwoven with guided Quran memorization in a calm environment." },
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
        { q: "What is the ideal age to enroll my child in the Montessori program?", a: "Our Montessori program is designed for children aged 3 to 6 years. Starting at age 3 lets children fully benefit from the three-year cycle, building strong foundations before transitioning onward." },
        { q: "Do you require an assessment or interview prior to admission?", a: "Yes, we conduct a gentle assessment and a family interview. It is not a formal test, but a chance to understand your child's needs and ensure our philosophy aligns with your family's values." },
      ],
    },
    {
      id: "islamic", icon: "menu_book", category: "Islamic integration (Tajweed & Quran)",
      items: [
        { q: "How much time is dedicated to the Hifz program daily?", a: "Students in the dedicated Hifz track spend roughly 2.5 to 3 hours daily on memorization, revision, and Tajweed, carefully balanced with core academics." },
        { q: "Does my child need prior Arabic knowledge to join?", a: "No prior knowledge is required. Our levelled Arabic curriculum supports beginners and advanced speakers alike, with individualized support so every child progresses at their own pace." },
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
      { author: "Aisha M.", relation: "Parent of a nursery student", quote: "The balance between rigorous academics and spiritual grounding is exceptional. I feel truly partnered with the teachers." },
      { author: "Omar K.", relation: "Parent of a kindergartener", quote: "The transparency gives us peace of mind. Seeing the halal menu and daily schedule helps us reinforce lessons at home." },
      { author: "Sarah & Tariq", relation: "Hifz program parents", quote: "Clear expectations from day one. A professional, beautifully organized system that respects our time as parents." },
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
