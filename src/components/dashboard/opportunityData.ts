/**
 * Browsable opportunities catalog for the Resources page.
 * Includes real essay competitions, extracurriculars, programs,
 * olympiads, and scholarships that students can add to their timeline.
 */

export type OpportunityType =
  | "essay-competition"
  | "olympiad"
  | "scholarship"
  | "program"
  | "extracurricular";

export type OpportunityTrack = "uk" | "us" | "both";

export interface Opportunity {
  id: string;
  name: string;
  organizer: string;
  type: OpportunityType;
  track: OpportunityTrack;
  /** ISO date string YYYY-MM-DD for the primary deadline */
  deadline: string;
  /** Optional note shown next to the date, e.g. "varies by round" */
  deadlineNote?: string;
  /** One-sentence description shown on the card */
  description: string;
  /** Longer text shown in the detail expand */
  details?: string;
  externalUrl?: string;
  /** Tailwind accent color name used for styling */
  accent: "indigo" | "blue" | "amber" | "green" | "emerald" | "purple" | "violet" | "red" | "rose" | "teal";
  tags: string[];
}

/* ================================================================
   UK OPPORTUNITIES
   ================================================================ */

const UK_OPPORTUNITIES: Opportunity[] = [
  {
    id: "john-locke-essay",
    name: "John Locke Essay Competition",
    organizer: "John Locke Institute",
    type: "essay-competition",
    track: "uk",
    deadline: "2026-04-01",
    description: "Prestigious independent essay competition across Philosophy, Politics, Economics, History, Psychology, Theology, and Law.",
    details: "One of the most respected essay prizes for secondary school students. Winners receive a cash prize and are published. Shortlisted students are invited to an awards ceremony in Oxford. Judges include Oxford and Cambridge academics.",
    externalUrl: "https://johnlockeinstitute.com/essay-competition",
    accent: "indigo",
    tags: ["essay", "philosophy", "politics", "economics", "history", "oxford"],
  },
  {
    id: "british-physics-olympiad",
    name: "British Physics Olympiad (Round 1)",
    organizer: "British Physics Olympiad",
    type: "olympiad",
    track: "uk",
    deadline: "2026-11-06",
    description: "The UK's leading physics competition for A-Level students, leading to selection for the International Physics Olympiad team.",
    details: "Round 1 consists of a 2-hour paper sat in school. Top scorers are invited to Round 2, then the British Physics Olympiad training camp. Strong performance is highly valued in Oxford/Cambridge Physics applications.",
    externalUrl: "https://www.bpho.org.uk",
    accent: "blue",
    tags: ["physics", "stem", "competition", "olympiad"],
  },
  {
    id: "ukmt-senior-challenge",
    name: "UKMT Senior Mathematical Challenge",
    organizer: "UK Mathematics Trust",
    type: "olympiad",
    track: "uk",
    deadline: "2026-11-05",
    description: "A 90-minute multiple-choice challenge for Year 12-13 students - a gateway to the British Mathematical Olympiad.",
    details: "Top-scoring students are invited to the British Mathematical Olympiad (BMO1), and further success leads to selection for the IMO. UKMT achievements are highly regarded by Oxford, Cambridge, and top universities for Maths courses.",
    externalUrl: "https://www.ukmt.org.uk",
    accent: "amber",
    tags: ["maths", "mathematics", "stem", "competition"],
  },
  {
    id: "british-chemistry-olympiad",
    name: "British Chemistry Olympiad (Part 1)",
    organizer: "Royal Society of Chemistry",
    type: "olympiad",
    track: "uk",
    deadline: "2027-01-15",
    description: "Annual chemistry competition for A-Level students, leading to team selection for the International Chemistry Olympiad.",
    details: "Taken in school, Part 1 is a 2-hour paper. Top performers are invited to Part 2, and a residential course selects the UK team for the IChO. Strong performance is valued for Chemistry and Natural Sciences applications.",
    externalUrl: "https://www.rsc.org/education/students/olympiad",
    accent: "green",
    tags: ["chemistry", "stem", "competition", "olympiad"],
  },
  {
    id: "british-biology-olympiad",
    name: "British Biology Olympiad",
    organizer: "Royal Society of Biology",
    type: "olympiad",
    track: "uk",
    deadline: "2027-01-22",
    description: "Challenge biology knowledge beyond A-Level and compete for a place in the UK team at the International Biology Olympiad.",
    details: "Two 45-minute papers covering a wide range of biology topics. Gold, Silver and Bronze awards are given. Top students are invited to a selection round for the IBO team. Excellent for Medicine, Natural Sciences, and Biology applications.",
    externalUrl: "https://www.rsb.org.uk/education/british-biology-olympiad",
    accent: "emerald",
    tags: ["biology", "medicine", "stem", "competition"],
  },
  {
    id: "uklo",
    name: "UK Linguistics Olympiad (UKLO)",
    organizer: "UK Linguistics Olympiad",
    type: "olympiad",
    track: "uk",
    deadline: "2027-01-31",
    description: "Puzzle-based linguistics competition open to all UK secondary students - no prior linguistics knowledge needed.",
    details: "Consists of a Foundation Round sat in school. High scorers are invited to the Advanced Round, then the international team selection. Strong signal for Linguistics, MML, and related courses at Oxbridge.",
    externalUrl: "https://www.uklo.org",
    accent: "teal",
    tags: ["linguistics", "languages", "humanities", "competition"],
  },
  {
    id: "arkwright-scholarship",
    name: "Arkwright Engineering Scholarship",
    organizer: "Arkwright Scholarships Trust",
    type: "scholarship",
    track: "uk",
    deadline: "2026-03-20",
    description: "Prestigious scholarships for students aspiring to become engineering and technical leaders, sponsored by leading companies.",
    details: "Open to Year 12 students (and equivalent). Scholars receive a bursary, a company sponsor, and access to a network of engineers and opportunities. Highly regarded for Engineering, Physics, and Computer Science applications.",
    externalUrl: "https://www.arkwright.org.uk",
    accent: "amber",
    tags: ["engineering", "scholarship", "stem", "leadership"],
  },
  {
    id: "sutton-trust-summer-school",
    name: "Sutton Trust Summer Schools",
    organizer: "Sutton Trust",
    type: "program",
    track: "uk",
    deadline: "2026-02-15",
    description: "Free residential summer schools at leading UK universities for students from less advantaged backgrounds.",
    details: "Held at Oxford, Cambridge, Bristol, Edinburgh, and other top universities. Year 12 students experience university life, academic lectures, and admissions workshops. A strong contextual signal in university applications.",
    externalUrl: "https://www.suttontrust.com/our-programmes/summer-schools",
    accent: "purple",
    tags: ["summer school", "access", "oxford", "cambridge", "university", "residential"],
  },
  {
    id: "sutton-trust-us-programme",
    name: "Sutton Trust US Programme",
    organizer: "Sutton Trust",
    type: "program",
    track: "uk",
    deadline: "2026-02-01",
    description: "A fully-funded programme helping UK students from less advantaged backgrounds apply to top US universities.",
    details: "Participants receive mentoring, campus visits to Ivy League and other top US universities, and support throughout the US application process. Open to Year 12 students from state schools with limited family income.",
    externalUrl: "https://www.suttontrust.com/our-programmes/us-programme",
    accent: "violet",
    tags: ["us", "scholarship", "access", "programme", "ivy league"],
  },
  {
    id: "young-enterprise",
    name: "Young Enterprise Company Programme",
    organizer: "Young Enterprise",
    type: "extracurricular",
    track: "uk",
    deadline: "2026-10-01",
    description: "Run a real business in school with a volunteer business mentor - compete locally, regionally, and nationally.",
    details: "Teams of 5-20 students set up and run a business for the school year. Compete in area finals and potentially the national final. Develops entrepreneurship, leadership, and financial skills valued by universities and employers.",
    externalUrl: "https://www.young-enterprise.org.uk",
    accent: "green",
    tags: ["business", "entrepreneurship", "leadership", "extracurricular"],
  },
  {
    id: "duke-of-edinburgh-gold",
    name: "Duke of Edinburgh Gold Award",
    organizer: "The Duke of Edinburgh's Award",
    type: "extracurricular",
    track: "uk",
    deadline: "2026-09-01",
    deadlineNote: "start by Year 12",
    description: "A world-renowned achievement award including a volunteering project, physical challenge, skill, expedition, and residential.",
    details: "The Gold Award takes approximately 18 months and includes 12 months each of volunteering and a skill/physical activity, a 4-day gold expedition, and a 5-day residential away from home. Widely recognised by UK and international universities.",
    externalUrl: "https://www.dofe.org",
    accent: "rose",
    tags: ["volunteering", "leadership", "extracurricular", "award"],
  },
  {
    id: "esu-public-speaking",
    name: "ESU Schools' Public Speaking Competition",
    organizer: "English Speaking Union",
    type: "extracurricular",
    track: "uk",
    deadline: "2026-10-15",
    description: "The UK's largest public speaking competition for secondary school students - compete in pairs at school, regional and national level.",
    details: "Pairs consist of a speaker and a chairperson. Topics are drawn at random on the day. Regional and national finals are held in prestigious venues. Strong signal for PPE, Law, Politics, and related applications.",
    externalUrl: "https://www.esu.org/education/schools-public-speaking",
    accent: "blue",
    tags: ["public speaking", "debate", "communication", "extracurricular"],
  },
];

/* ================================================================
   US OPPORTUNITIES
   ================================================================ */

const US_OPPORTUNITIES: Opportunity[] = [
  {
    id: "questbridge-ncm",
    name: "QuestBridge National College Match",
    organizer: "QuestBridge",
    type: "scholarship",
    track: "us",
    deadline: "2026-09-27",
    description: "Connects high-achieving, low-income students with full four-year scholarships to 50+ leading US colleges.",
    details: "College Match is binding - matched students receive a full scholarship covering tuition, room, board, and fees. Finalists who aren't matched still benefit from streamlined applications to partner colleges. One of the most prestigious US scholarships.",
    externalUrl: "https://www.questbridge.org",
    accent: "amber",
    tags: ["scholarship", "us", "financial aid", "full ride", "ivy league"],
  },
  {
    id: "coca-cola-scholars",
    name: "Coca-Cola Scholars Program",
    organizer: "Coca-Cola Scholars Foundation",
    type: "scholarship",
    track: "us",
    deadline: "2026-10-31",
    description: "One of the most prestigious US scholarships - 150 high school seniors receive $20,000 each based on leadership and community service.",
    details: "Applicants are evaluated on character, leadership, and service. The online application opens September 1. Scholars join a network of over 6,500 alumni and attend a Scholars Weekend in Atlanta.",
    externalUrl: "https://www.coca-colascholarsfoundation.org",
    accent: "red",
    tags: ["scholarship", "leadership", "community service", "us"],
  },
  {
    id: "davidson-fellows",
    name: "Davidson Fellows Scholarship",
    organizer: "Davidson Institute",
    type: "scholarship",
    track: "us",
    deadline: "2026-02-13",
    description: "Scholarships of $10,000, $25,000, and $50,000 for students under 18 with a significant piece of work in STEM, literature, or music.",
    details: "Applicants submit a significant piece of work demonstrating proficiency - a research paper, composition, literary work, or product. No minimum GPA. Fellows are celebrated in Washington DC and join an elite network.",
    externalUrl: "https://www.davidsongifted.org/fellows-scholarship",
    accent: "purple",
    tags: ["scholarship", "research", "stem", "arts", "us"],
  },
  {
    id: "regeneron-sts",
    name: "Regeneron Science Talent Search",
    organizer: "Society for Science",
    type: "olympiad",
    track: "us",
    deadline: "2026-11-01",
    description: "America's oldest and most prestigious pre-college science competition - submit original research for a chance at $250,000.",
    details: "High school seniors submit original research projects. 300 semifinalists each receive $2,000. 40 finalists are invited to Washington DC for a week-long showcase and compete for top awards up to $250,000. Highly valued by top universities.",
    externalUrl: "https://www.societyforscience.org/regeneron-sts",
    accent: "blue",
    tags: ["research", "science", "stem", "competition", "us"],
  },
  {
    id: "scholastic-writing",
    name: "Scholastic Art & Writing Awards",
    organizer: "Alliance for Young Artists & Writers",
    type: "essay-competition",
    track: "us",
    deadline: "2026-12-06",
    description: "The most prestigious recognition for creative teens in the US - submit poetry, fiction, essays, and more for regional and national awards.",
    details: "Students in grades 7-12 submit work in 29 categories including poetry, personal essay/memoir, science fiction, humor, and more. Regional awards are judged locally; national Gold Medal winners are recognized in New York City.",
    externalUrl: "https://www.artandwriting.org",
    accent: "indigo",
    tags: ["writing", "creative", "essay", "poetry", "fiction", "us"],
  },
  {
    id: "harvard-model-congress",
    name: "Harvard Model Congress",
    organizer: "Harvard University",
    type: "program",
    track: "us",
    deadline: "2026-11-15",
    description: "One of the nation's largest student-run policy conferences - simulate US Congress and other government bodies in Boston.",
    details: "High school students participate in committees simulating Congress, the Supreme Court, and other government bodies. Delegates write legislation, debate policy, and develop leadership skills. Held annually in February in Boston.",
    externalUrl: "https://www.harvardmodelcongress.org",
    accent: "red",
    tags: ["government", "policy", "leadership", "model congress", "us"],
  },
  {
    id: "national-merit",
    name: "National Merit Scholarship Program",
    organizer: "National Merit Scholarship Corporation",
    type: "scholarship",
    track: "us",
    deadline: "2026-10-14",
    deadlineNote: "via PSAT in Oct",
    description: "Enter by taking the PSAT/NMSQT - the top scorers in each state become Semifinalists and compete for $2,500 scholarships.",
    details: "The PSAT serves as the qualifying test. About 16,000 Semifinalists advance to Finalist status by completing a detailed scholarship application. Approximately 7,500 Finalists win National Merit Scholarships worth $2,500, plus corporate and college-sponsored awards.",
    externalUrl: "https://www.nationalmerit.org",
    accent: "amber",
    tags: ["scholarship", "psat", "standardised test", "us"],
  },
  {
    id: "science-olympiad",
    name: "Science Olympiad",
    organizer: "Science Olympiad Inc.",
    type: "extracurricular",
    track: "us",
    deadline: "2026-11-01",
    deadlineNote: "invitational season begins",
    description: "A team STEM competition with 23 events spanning biology, chemistry, physics, earth science, and engineering.",
    details: "Teams of 15 compete at invitational, regional, state, and national tournaments. Events range from built devices and experiments to written tests. Competing at the state or national level is highly valued by top universities.",
    externalUrl: "https://www.soinc.org",
    accent: "green",
    tags: ["stem", "team", "biology", "chemistry", "physics", "us"],
  },
  {
    id: "nsda-debate",
    name: "National Speech & Debate",
    organizer: "National Speech & Debate Association",
    type: "extracurricular",
    track: "us",
    deadline: "2026-09-01",
    deadlineNote: "join your school team",
    description: "Join your school's debate team and compete locally, regionally, and nationally in Lincoln-Douglas, Policy, or Public Forum debate.",
    details: "Over 150,000 students compete annually. National qualifiers attend the Tournament of Champions and National Championship. Debate experience is highly valued by top US universities for developing critical thinking and communication skills.",
    externalUrl: "https://www.speechanddebate.org",
    accent: "blue",
    tags: ["debate", "speech", "leadership", "extracurricular", "us"],
  },
  {
    id: "model-un",
    name: "Model United Nations (MUN)",
    organizer: "Various (HMUN, NYMUN, CMUN, etc.)",
    type: "extracurricular",
    track: "both",
    deadline: "2026-10-01",
    deadlineNote: "conference season begins",
    description: "Simulate UN committee debates on global issues - conferences run year-round in the UK and US at school, national, and international level.",
    details: "Students represent countries and debate international policy topics. Prestigious conferences include HMUN (Harvard), NYMUN, CMUN, and UK-based conferences like OXMUN and LMUN. Leadership roles as Secretary-General or chair are especially impressive on applications.",
    externalUrl: "https://www.un.org/en/mun",
    accent: "teal",
    tags: ["debate", "international relations", "policy", "leadership", "extracurricular"],
  },
  {
    id: "nyt-editorial",
    name: "NYT Student Editorial Contest",
    organizer: "New York Times Learning Network",
    type: "essay-competition",
    track: "us",
    deadline: "2027-02-14",
    description: "Write a 450-word persuasive editorial on any topic - winners are published in the New York Times.",
    details: "Open to students aged 13-19. No entry fee. Submissions must be argumentative, clearly stated, and evidence-based. Top entries are published on the NYT Learning Network and selected winners in the print edition.",
    externalUrl: "https://www.nytimes.com/spotlight/learning-editorial-contest",
    accent: "indigo",
    tags: ["writing", "editorial", "essay", "journalism", "us"],
  },
  {
    id: "girls-who-code",
    name: "Girls Who Code Summer Immersion",
    organizer: "Girls Who Code",
    type: "program",
    track: "us",
    deadline: "2026-03-15",
    description: "A free 2-week intensive coding program for high school girls and non-binary students, hosted by leading tech companies.",
    details: "Participants learn web development, robotics, and mobile apps. Hosted at companies including Google, Apple, and Twitter. Alumni receive support through college and career. Open to students entering grades 10-12.",
    externalUrl: "https://girlswhocode.com/programs/summer-immersion-program",
    accent: "purple",
    tags: ["coding", "tech", "stem", "women in tech", "program", "us"],
  },
];

/* ================================================================
   COMBINED EXPORT
   ================================================================ */

export const OPPORTUNITIES: Opportunity[] = [
  ...UK_OPPORTUNITIES,
  ...US_OPPORTUNITIES,
];

/* ── Type label helpers ── */
export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  "essay-competition": "Essay Competition",
  "olympiad": "Competition",
  "scholarship": "Scholarship",
  "program": "Programme",
  "extracurricular": "Extracurricular",
};

/* ── Accent class helper ── */
export function getAccentClasses(accent: Opportunity["accent"]): {
  bg: string;
  text: string;
  border: string;
  badge: string;
  strip: string;
} {
  const map: Record<Opportunity["accent"], ReturnType<typeof getAccentClasses>> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", strip: "bg-indigo-500" },
    blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",   strip: "bg-blue-500" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",  strip: "bg-amber-500" },
    green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  badge: "bg-green-100 text-green-700",  strip: "bg-green-500" },
    emerald:{ bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700", strip: "bg-emerald-500" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", strip: "bg-purple-500" },
    violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", strip: "bg-violet-500" },
    red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    badge: "bg-red-100 text-red-700",    strip: "bg-red-500" },
    rose:   { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   badge: "bg-rose-100 text-rose-700",   strip: "bg-rose-500" },
    teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   badge: "bg-teal-100 text-teal-700",   strip: "bg-teal-500" },
  };
  return map[accent];
}
