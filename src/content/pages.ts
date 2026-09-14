import type {
  AboutPage, ProgramsPage, AdmissionsPage, CampusPage, FaqPage, ParentPage, ContactPage, TrustPage,
} from "./types";

export const trust: TrustPage = {
  eyebrow: "Why families trust us",
  title: "Checkable, not just claimed.",
  rainbow: ["Checkable"],
  subtitle: "Anyone can call themselves warm and nurturing. Here is what you can actually verify about us.",
  items: [
    {
      icon: "verified",
      title: "Affiliated with Anjuman Taleemul Qur'an, Calicut",
      body: "Our Qur'an teaching is not in-house improvisation. We deliver the Noor-ul-Bayan System, developed in Egypt and brought to India by Anjuman Taleemul Qur'an, Calicut, with whom we are affiliated.",
    },
    {
      icon: "school",
      title: "Oxford Early Learning Curriculum",
      body: "Academics follow a published, internationally used early-years curriculum for English, Mathematics and EVS, not a syllabus we invented.",
    },
    {
      icon: "conversion_path",
      title: "One continuous three-year journey",
      body: "Pre-KG, Junior KG and Senior KG are a single programme with one entry point. We do not take lateral entries, because a child who joins in year two has missed the Qur'an foundation the later years are built on.",
    },
    {
      icon: "tour",
      title: "Walk in any school day, unannounced",
      body: "No appointment, no tour script, no notice. Come between 9:00 AM and 1:30 PM on any working day and see the classrooms as they actually are.",
    },
  ],
};

export const about: AboutPage = {
  hero: {
    eyebrow: "Our story",
    title: "Nurturing the innate goodness in every child.",
    subtitle:
      "We believe every child is born with a natural capacity for learning, compassion, and connection. Al Fitrah is the environment for that nature to flourish.",
  },
  mission: {
    title: "Our mission",
    body: "To give every child three unbroken years in which Qur'an and academics are taught by the same teachers, in the same room, on the same day. Not a school with Islamic classes bolted on, and not a madrasa with some English: one day, one rhythm, both halves of a child's life treated as one thing.",
  },
  vision: {
    title: "What we are aiming at",
    body: "A child who leaves us able to read the Qur'an with Tajweed and ready to walk into Grade 1 at any recognised school without catching up, and who has never been taught to think of those two abilities as belonging to different parts of their life.",
  },
  team: {
    title: "Guided by experts",
    subtitle: "Our teachers are the heart of Al Fitrah. They are patient with young children, and steady on both learning and good character.",
    image: "/images/circle-time.png",
    imageAlt: "An Al Fitrah teacher leading circle time with children, illustrated",
    points: [
      { icon: "verified", title: "Authentic Qur'anic method", body: "Our teaching is rooted in the Noor-ul-Bayan System, developed in Egypt and delivered in India through Anjuman Taleemul Qur'an, Calicut, with whom Al Fitrah is proudly affiliated." },
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
      "Three years that pair a solid academic foundation with daily Qur'an and Islamic learning, preparing your child for school, and for life.",
    stats: [
      { icon: "child_care", label: "Age group", value: "2.10 - 3.10 yrs" },
      { icon: "schedule", label: "Duration", value: "3 years" },
    ],
  },
  levels: {
    title: "Three years, one continuous journey.",
    rainbow: ["continuous"],
    subtitle: "There is one entry point, at Pre-KG. Each year is built on the one before it, which is why we do not take lateral entries into Junior or Senior KG.",
    items: [
      {
        badge: "Year 1",
        name: "Pre-KG",
        stage: "Ages 2y10m - 3y10m · The only entry point",
        summary: "The year your child learns that school is a safe, happy place. Most of it is settling in: routines, first friendships, and the confidence to be away from home for a few hours.",
        quran: "Short Surahs learned by listening and repetition, plus the Noor-ul-Bayan letter foundations. No pressure, no testing.",
        academics: "Phonics readiness and early numeracy, taught almost entirely through play, sand, water, blocks and stories.",
        character: "Morning and mealtime Du'as, greeting others, sharing and taking turns.",
      },
      {
        badge: "Year 2",
        name: "Junior KG",
        stage: "The foundation year",
        summary: "Confidence turns into skill. Your child starts reading Arabic letters properly, writing English letters properly, and working in a group rather than beside one.",
        quran: "Continued Qur'an reading with introductory Tajweed, and Arabic letter joining through the Noor-ul-Bayan method.",
        academics: "English phonics and early writing, expanding mathematics, and EVS: nature, community, health and hygiene.",
        character: "Basics of Aqeedah, Hadith for children, and Du'as for daily life.",
      },
      {
        badge: "Year 3",
        name: "Senior KG",
        stage: "Grade 1 readiness",
        summary: "The year everything consolidates. By the end your child can read Qur'an with Tajweed and walk into Grade 1 at any recognised school without catching up.",
        quran: "Fluency and revision toward memorisation of up to 2 Juz of selected Surahs, with Tajweed.",
        academics: "English reading and writing, and numeracy pitched at Grade 1 readiness. Arabic reading fluency and simple comprehension.",
        character: "Independence, responsibility, and Islamic habits a child keeps after they leave us.",
      },
    ],
  },
  method: {
    title: "How we teach it.",
    rainbow: ["teach"],
    subtitle: "Two established methods and one conviction about how small children actually learn.",
    items: [
      {
        icon: "child_care",
        title: "Through play, not worksheets",
        body: "Children this age learn with their hands. Sensory play, role play, stories and group activities do the work that drilling cannot at three years old.",
      },
      {
        icon: "school",
        title: "Oxford Early Learning Curriculum",
        body: "A published, internationally used early-years curriculum for English, Mathematics and EVS. We follow it rather than inventing a syllabus of our own.",
      },
      {
        icon: "menu_book",
        title: "The Noor-ul-Bayan System",
        body: "Developed in Egypt and delivered in India by Anjuman Taleemul Qur'an, Calicut, with whom we are affiliated. The standard your child is held to is not set by us alone.",
      },
    ],
    tags: ["Hands-on", "Storytelling", "Art & craft", "Role play"],
    image: "/images/real/play-room.jpg",
    imageAlt: "Children's play equipment and soft flooring in the Al Fitrah play room",
    imageCaption: "Nurturing a lifelong love for learning.",
  },
  quranMethod: {
    eyebrow: "The Noor-ul-Bayan method",
    title: "Qur'an, taught letter by letter.",
    rainbow: ["letter"],
    subtitle: "Recitation and Tajweed built up the same way for every child: one letter, one rule, one Surah at a time.",
    images: [
      { src: "/images/quran/tajweed-guidance.jpg", alt: "A student receiving one-to-one Qur'an recitation guidance, following the Tajweed rules", caption: "One-to-one Tajweed guidance" },
      { src: "/images/quran/reading-together.jpg", alt: "Two students reading the Qur'an together", caption: "Reading and revising together" },
    ],
  },
  outcomes: {
    eyebrow: "By the end of three years",
    title: "What three years add up to.",
    statement: "Your child reads the Qur'an fluently with Tajweed, has memorised up to 2 Juz of selected Surahs, and can walk into Grade 1 at any recognised school without catching up.",
    body: "We are a preschool, not a feeder for one particular institution. Families choose their onward school freely, and children leave prepared for it.",
    cta: { label: "View full syllabus", href: "/syllabus", variant: "gold" },
  },
};

export const admissions: AdmissionsPage = {
  hero: {
    eyebrow: "Admissions 2026-27",
    title: "Secure your child's place.",
    subtitle:
      "Admissions are at the Pre-KG entry level for children aged 2 years 10 months to 3 years 10 months. The process is clear, supportive, and welcoming to every family.",
  },
  process: {
    title: "Admissions process",
    steps: [
      { icon: "edit_note", title: "Submit inquiry", body: "Fill out the form to express interest and share a few basic details." },
      { icon: "tour", title: "Campus visit", body: "Drop by during school hours (9:00 AM - 1:30 PM) to experience our nurturing environment." },
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
      "A calm, structured day built around learning, play, and Qur'an, with room for every child to grow at their own pace.",
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
    subtitle: "Common questions about admissions, the curriculum, and daily life at Al Fitrah.",
  },
  groups: [
    {
      id: "admissions", icon: "assignment", category: "Admissions process",
      items: [
        { q: "What is the ideal age to enroll my child?", a: "Admissions are at our Pre-KG entry level for children aged 2 years 10 months to 3 years 10 months. The program is a continuous three-year journey (Pre-KG, Junior KG, then Senior KG), so we do not offer direct entry into Junior or Senior KG." },
        { q: "Do you require an assessment or interview prior to admission?", a: "We hold a brief, friendly interaction with the child and family. It is not a formal test, but a chance to understand your child's needs and ensure our philosophy aligns with your family's values." },
        { q: "Can I visit before deciding?", a: "Yes, and without telling us you are coming. Walk in on any working day between 9:00 AM and 1:30 PM. There is no appointment, no scheduled tour and no notice period, because a campus worth choosing should hold up on an ordinary morning." },
        { q: "Can my child join mid-year, or start directly in Junior KG?", a: "No. There is one entry point, at Pre-KG. Junior and Senior KG are built on the Qur'an and Arabic foundation laid in year one, so a child joining later would be working from a base they have not been given." },
      ],
    },
    {
      id: "islamic", icon: "menu_book", category: "Islamic curriculum (Noor-ul-Bayan)",
      items: [
        { q: "How is the Qur'an taught at Al Fitrah?", a: "Through the Noor-ul-Bayan System, children build Qur'an reading, fluency, and Tajweed, and memorize up to 2 Juz of selected Surahs across the three years, integrated into the daily rhythm alongside Aqeedah, Hadith, and Du'as, not as a separate intensive track." },
        { q: "Does my child need prior Arabic knowledge to join?", a: "No prior knowledge is required. The Noor-ul-Bayan method starts from the foundations and supports every child individually, so each progresses at their own pace." },
        { q: "What exactly is the Noor-ul-Bayan System?", a: "A structured Qur'an reading method developed in Egypt and delivered in India by Anjuman Taleemul Qur'an, Calicut, with whom Al Fitrah is affiliated. It is an established, externally governed method rather than something we devised in-house, which means the standard your child is taught to is not set by us alone." },
        { q: "Is Qur'an taught as a separate class?", a: "No. It runs through the ordinary school day alongside English, Mathematics and EVS, taught by the same staff in the same room. Children never learn to treat Deen as the thing that happens after real school finishes." },
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
        { q: "Which days are you open?", a: "Monday to Saturday, 9:00 AM to 1:30 PM. Term dates, breaks and public holidays for the year are published in full on the parent resources page." },
        { q: "What happens after Senior KG?", a: "Children leave academically prepared for Grade 1 at any recognised school. We are a three-year preschool, not a feeder for one particular institution, so families choose their onward school freely." },
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
    subtitle: "Academic calendars, uniform guidance, and the practical details families ask about most.",
  },
  resources: [
    { icon: "event", title: "Academic calendar", body: "Holidays, assessments, parent meetings, and celebrations for 2026-27. See the full year below.", action: "See dates below", large: true },
    { icon: "styler", title: "Uniform guidelines", body: "Modest, comfortable attire requirements.", action: "Read more" },
    { icon: "menu_book", title: "Parent handbook", body: "Policies, procedures, and core values.", action: "Read more" },
    { icon: "volunteer_activism", title: "Get involved", body: "Volunteer opportunities for parents.", action: "Read more" },
  ],
  academicCalendar: {
    title: "Academic Year 2026-27",
    subtitle: "The key dates families need through the year. A few dates are tentative and may shift slightly, and we'll always confirm ahead of time.",
    note: "Returning students reopen on 3 June 2026. Pre-KG (Beginners) orientation is 6 June, with classes from 8 June.",
    groups: [
      {
        icon: "celebration",
        title: "Celebrations & special days",
        items: [
          "Red Day - 25 Jun",
          "Green Day - 9 Jul",
          "Fruit Day - 23 Jul",
          "Independence Day celebration - 14 Aug",
          "Blue Day - 10 Sep",
          "School picnic - 15 Oct",
          "Professions Day - 5 Nov",
          "Sports Day - 28 Nov",
          "Yellow Day - 3 Dec",
          "Number Day - 7 Jan",
          "Annual Day - 30 Jan (tentative)",
        ],
      },
      {
        icon: "fact_check",
        title: "Assessments & parent meetings",
        items: [
          "Assessment 1 - 16-24 Sep",
          "PTM 1 - 26 Sep",
          "Assessment 2 - 10-18 Dec",
          "PTM 2 - 2 Jan",
          "Assessment 3 - 17-25 Mar",
          "PTM 3 - 27 Mar",
        ],
      },
      {
        icon: "beach_access",
        title: "Breaks & vacations",
        items: [
          "Winter break - 24-29 Dec (reopens 30 Dec)",
          "Ramadan & Eid break - 1-14 Mar (reopens 15 Mar)",
          "Last working day - 31 Mar (tentative)",
          "Summer vacation - 1 Apr - 31 May",
        ],
      },
      {
        icon: "event_busy",
        title: "Public holidays",
        items: [
          "Muharram - 26 Jun",
          "Independence Day - 15 Aug",
          "Ganesh Chaturthi - 14 Sep",
          "Gandhi Jayanti - 2 Oct",
          "Dussehra - 19-21 Oct",
          "Diwali - 9 Nov",
          "Sankranti - 15 Jan",
          "Republic Day - 26 Jan",
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
    address: ["3rd Floor, Vivian Complex", "Opp HP Petrol Bunk, Sompura Gate", "Sarjapura, Bengaluru, Karnataka 562125"],
    phones: ["+91 99865 00718", "+91 99860 49413"],
    email: "alfitrah.sompura@gmail.com",
  },
  image: "/images/map.png",
  imageAlt: "Map showing the Al Fitrah campus near Sompura Gate, Sarjapura",
  hours: {
    title: "Visit us",
    rows: [
      { label: "School hours", value: "9:00 AM - 1:30 PM" },
      { label: "Campus visits", value: "Walk in during school hours" },
    ],
    note: "You're welcome to visit during school hours, no appointment needed. Feel free to call or message ahead if you'd like.",
  },
};
