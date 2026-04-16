/**
 * Static data for the ApplicationTimeline component.
 * Extracted to a separate file to reduce the main component's bundle size
 * and allow better code-splitting.
 */

import type { TimelineItem } from "./ApplicationTimeline";

/* ================================================================
   GOAL TEMPLATE TYPE
   ================================================================ */

export interface GoalTemplate {
  key: string;
  name: string;
  track: "uk" | "us";
  icon: string;
  color: string;
  colorClasses: { border: string; bg: string; text: string };
  description: string;
  deadlines: Omit<TimelineItem, "id" | "goalId" | "goalName">[];
}

/* ================================================================
   GOAL TEMPLATES
   ================================================================ */

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // --- UK Goals ---
  {
    key: "oxford",
    name: "Oxford",
    track: "uk",
    icon: "Award",
    color: "#002147",
    colorClasses: { border: "border-[#002147]/40", bg: "bg-[#002147]/5", text: "text-[#002147]" },
    description: "Oxford-specific deadlines, admissions tests, and interview preparation",
    deadlines: [
      { title: "Research Oxford course requirements", date: "2026-06-15", description: "Look into specific course prerequisites, reading lists, and selection criteria for your Oxford course.", completed: false, category: "milestone", track: "uk", actionLink: "/dashboard/profile", actionLabel: "Update your university list" },
      { title: "Start super-curricular reading (Oxford)", date: "2026-07-01", description: "Build academic depth beyond the syllabus. Oxford values intellectual curiosity in your subject.", completed: false, category: "reminder", track: "uk", actionLink: "/tutors", actionLabel: "Find a tutor for guidance" },
      { title: "Practice Oxford admissions test papers", date: "2026-09-01", description: "Work through past papers for MAT, TSA, PAT, LNAT, or other relevant tests.", completed: false, category: "milestone", track: "uk", actionLink: "/tutors", actionLabel: "Book test prep session" },
      { title: "Oxford UCAS deadline", date: "2026-10-15", description: "UCAS deadline for all Oxford applications. Make sure your personal statement is finalised.", completed: false, category: "deadline", track: "uk" },
      { title: "Oxford admissions tests", date: "2026-10-31", description: "Sit your Oxford admissions test (MAT, TSA, PAT, LNAT, etc.).", completed: false, category: "deadline", track: "uk" },
      { title: "Mock interview preparation (Oxford)", date: "2026-11-01", description: "Arrange mock interviews with tutors to prepare for Oxford's interview style.", completed: false, category: "reminder", track: "uk", actionLink: "/tutors", actionLabel: "Book mock interview" },
      { title: "Oxford interviews", date: "2026-12-10", description: "Attend your Oxford interview(s). These typically run in early-to-mid December.", completed: false, category: "deadline", track: "uk" },
      { title: "Oxford decisions released", date: "2027-01-14", description: "Oxford releases decisions in early January.", completed: false, category: "milestone", track: "uk" },
    ],
  },
  {
    key: "cambridge",
    name: "Cambridge",
    track: "uk",
    icon: "GraduationCap",
    color: "#A3C1AD",
    colorClasses: { border: "border-emerald-400/40", bg: "bg-emerald-50/50", text: "text-emerald-700" },
    description: "Cambridge-specific deadlines, admissions assessments, and interview preparation",
    deadlines: [
      { title: "Research Cambridge course requirements", date: "2026-06-15", description: "Review the specific requirements, recommended reading, and selection process for your Cambridge course.", completed: false, category: "milestone", track: "uk", actionLink: "/dashboard/profile", actionLabel: "Update your university list" },
      { title: "Start super-curricular reading (Cambridge)", date: "2026-07-01", description: "Deepen your subject knowledge. Cambridge interviews are heavily academic.", completed: false, category: "reminder", track: "uk", actionLink: "/tutors", actionLabel: "Find a tutor for guidance" },
      { title: "Prepare COPA/SAQ forms (if applicable)", date: "2026-09-15", description: "Some Cambridge courses require a Supplementary Application Questionnaire or written work.", completed: false, category: "milestone", track: "uk" },
      { title: "Practice Cambridge admissions assessments", date: "2026-09-01", description: "Work through past papers for ENGAA, NSAA, TMUA, STEP, or other relevant tests.", completed: false, category: "milestone", track: "uk", actionLink: "/tutors", actionLabel: "Book test prep session" },
      { title: "Cambridge UCAS deadline", date: "2026-10-15", description: "UCAS deadline for all Cambridge applications.", completed: false, category: "deadline", track: "uk" },
      { title: "Cambridge pre-interview assessments", date: "2026-10-31", description: "Sit any required pre-interview assessments.", completed: false, category: "deadline", track: "uk" },
      { title: "Mock interview preparation (Cambridge)", date: "2026-11-01", description: "Practice with tutors. Cambridge interviews focus on problem-solving and thinking out loud.", completed: false, category: "reminder", track: "uk", actionLink: "/tutors", actionLabel: "Book mock interview" },
      { title: "Cambridge interviews", date: "2026-12-05", description: "Attend your Cambridge interview(s). These typically run in the first three weeks of December.", completed: false, category: "deadline", track: "uk" },
      { title: "Cambridge pool decisions", date: "2027-01-20", description: "If pooled, you may receive an offer from another college in late January.", completed: false, category: "milestone", track: "uk" },
    ],
  },
  {
    key: "ucas",
    name: "UCAS",
    track: "uk",
    icon: "BookOpen",
    color: "#2563EB",
    colorClasses: { border: "border-blue-400/40", bg: "bg-blue-50/50", text: "text-blue-700" },
    description: "Core UCAS application deadlines and milestones for all UK universities",
    deadlines: [
      { title: "UCAS application opens", date: "2026-09-01", description: "Begin filling in your UCAS application. You can submit from this date.", completed: false, category: "deadline", track: "uk" },
      { title: "UCAS equal consideration deadline", date: "2027-01-31", description: "Final deadline for equal consideration of all UCAS applications (non-Oxbridge/Medicine).", completed: false, category: "deadline", track: "uk" },
      { title: "UCAS Extra opens", date: "2027-02-25", description: "Apply to additional courses if you hold no offers or have declined all. Review options on your profile.", completed: false, category: "reminder", track: "uk", actionLink: "/dashboard/profile", actionLabel: "Review your universities" },
      { title: "Reply to offers deadline", date: "2027-06-05", description: "Confirm your firm and insurance choices on UCAS Track.", completed: false, category: "deadline", track: "uk" },
      { title: "UCAS Clearing opens", date: "2027-07-05", description: "Clearing opens for students who did not receive or accept offers.", completed: false, category: "reminder", track: "uk" },
      { title: "A-Level results day", date: "2027-08-19", description: "Receive your results and confirm your university place.", completed: false, category: "deadline", track: "uk" },
    ],
  },
  {
    key: "uk-general",
    name: "General",
    track: "uk",
    icon: "FlagGB",
    color: "#F97316",
    colorClasses: { border: "border-orange-400/40", bg: "bg-orange-50/50", text: "text-orange-700" },
    description: "General UK application milestones: research, personal statements, references, and more",
    deadlines: [
      { title: "Start researching universities and courses", date: "2026-06-01", description: "Explore university open days, course requirements, and entry criteria. Update your dream universities on your profile.", completed: false, category: "milestone", track: "uk", actionLink: "/dashboard/profile", actionLabel: "Update your university list" },
      { title: "Begin personal statement draft", date: "2026-07-01", description: "Start brainstorming and writing your first personal statement draft. Book a session with a tutor for guidance.", completed: false, category: "milestone", track: "uk", actionLink: "/tutors", actionLabel: "Find a tutor" },
      { title: "Request academic references", date: "2026-08-01", description: "Ask teachers to prepare your UCAS references well in advance.", completed: false, category: "reminder", track: "uk" },
      { title: "Admissions tests (UCAT, BMAT, MAT, etc.)", date: "2026-10-31", description: "Sit any required admissions tests for your chosen courses. Work with a tutor to prepare.", completed: false, category: "deadline", track: "uk", actionLink: "/tutors", actionLabel: "Book test prep session" },
      { title: "Offers start arriving", date: "2027-02-15", description: "Universities begin sending out conditional and unconditional offers.", completed: false, category: "milestone", track: "uk" },
    ],
  },

  // --- US Goals ---
  {
    key: "early-decision-i",
    name: "Early Decision I",
    track: "us",
    icon: "Zap",
    color: "#7C3AED",
    colorClasses: { border: "border-violet-400/40", bg: "bg-violet-50/50", text: "text-violet-700" },
    description: "Early Decision I is binding. Apply to your top-choice school with a Nov 1 deadline.",
    deadlines: [
      { title: "Finalise ED I school choice", date: "2026-08-15", description: "Early Decision is binding, so make sure this is truly your first-choice school. Update your profile.", completed: false, category: "milestone", track: "us", actionLink: "/dashboard/profile", actionLabel: "Update your college list" },
      { title: "Complete ED I supplemental essays", date: "2026-09-15", description: "Draft and polish the supplemental essays for your ED I school.", completed: false, category: "milestone", track: "us", actionLink: "/tutors", actionLabel: "Find an essay tutor" },
      { title: "ED I application deadline", date: "2026-11-01", description: "Submit your Early Decision I application. Most ED I deadlines fall on November 1.", completed: false, category: "deadline", track: "us" },
      { title: "ED I financial aid forms due", date: "2026-11-15", description: "Submit CSS Profile and/or FAFSA for your ED I school.", completed: false, category: "deadline", track: "us" },
      { title: "ED I decisions released", date: "2026-12-15", description: "Most ED I decisions are released by mid-December. If accepted, you must withdraw other applications.", completed: false, category: "milestone", track: "us" },
    ],
  },
  {
    key: "early-decision-ii",
    name: "Early Decision II",
    track: "us",
    icon: "Flame",
    color: "#DC2626",
    colorClasses: { border: "border-red-400/40", bg: "bg-red-50/50", text: "text-red-700" },
    description: "Early Decision II is also binding, with a Jan 1 deadline. A second chance at a top-choice school.",
    deadlines: [
      { title: "Decide on ED II school", date: "2026-12-20", description: "If you were not accepted ED I, pick your ED II school. This is also a binding commitment.", completed: false, category: "milestone", track: "us", actionLink: "/dashboard/profile", actionLabel: "Update your college list" },
      { title: "Complete ED II supplemental essays", date: "2026-12-25", description: "Write and refine the supplemental essays for your ED II school.", completed: false, category: "milestone", track: "us", actionLink: "/tutors", actionLabel: "Find an essay tutor" },
      { title: "ED II application deadline", date: "2027-01-01", description: "Submit your Early Decision II application. Most ED II deadlines fall on January 1.", completed: false, category: "deadline", track: "us" },
      { title: "ED II decisions released", date: "2027-02-15", description: "Most ED II decisions are released by mid-February.", completed: false, category: "milestone", track: "us" },
    ],
  },
  {
    key: "regular-decision",
    name: "Regular Decision",
    track: "us",
    icon: "FileText",
    color: "#2563EB",
    colorClasses: { border: "border-blue-400/40", bg: "bg-blue-50/50", text: "text-blue-700" },
    description: "Regular Decision deadlines for most US colleges, typically Jan 1-15",
    deadlines: [
      { title: "Build your college list", date: "2026-06-01", description: "Research schools, visit campuses, and narrow down your target list. Add your dream schools to your profile.", completed: false, category: "milestone", track: "us", actionLink: "/dashboard/profile", actionLabel: "Update your college list" },
      { title: "SAT/ACT preparation and testing", date: "2026-06-15", description: "Complete standardised testing (retakes available through fall). Book a tutor for test prep.", completed: false, category: "milestone", track: "us", actionLink: "/tutors", actionLabel: "Find a test prep tutor" },
      { title: "Start Common App essays", date: "2026-07-01", description: "Begin drafting your personal essay and supplemental essays. Work with a tutor to refine your writing.", completed: false, category: "milestone", track: "us", actionLink: "/tutors", actionLabel: "Find an essay tutor" },
      { title: "Request letters of recommendation", date: "2026-08-15", description: "Ask teachers, counselors, and mentors for recommendations.", completed: false, category: "reminder", track: "us" },
      { title: "Common Application opens", date: "2026-08-01", description: "Start filling in your Common App, Coalition App, or school-specific applications.", completed: false, category: "milestone", track: "us" },
      { title: "Regular Decision deadline", date: "2027-01-01", description: "Most RD applications due between Jan 1-15.", completed: false, category: "deadline", track: "us" },
      { title: "Submit financial aid forms (FAFSA/CSS)", date: "2027-02-01", description: "Complete financial aid applications for your target schools.", completed: false, category: "deadline", track: "us" },
      { title: "Regular Decision results", date: "2027-03-28", description: "Most schools release RD decisions in late March to early April.", completed: false, category: "milestone", track: "us" },
      { title: "National Decision Day", date: "2027-05-01", description: "Commit to your chosen school and submit your enrollment deposit.", completed: false, category: "deadline", track: "us" },
    ],
  },
];

/* ================================================================
   BROWSABLE DEADLINE CATALOG
   ================================================================ */

export interface DeadlineCatalogItem {
  title: string;
  date: string;
  description: string;
  category: "deadline" | "milestone" | "reminder";
  track: "uk" | "us";
  group: string;
  actionLink?: string;
  actionLabel?: string;
}

export const DEADLINE_CATALOG: DeadlineCatalogItem[] = [
  // --- UK Deadlines ---
  { group: "UCAS", title: "UCAS application opens", date: "2026-09-01", description: "Begin filling in your UCAS application", category: "deadline", track: "uk" },
  { group: "UCAS", title: "Oxbridge & Medicine UCAS deadline", date: "2026-10-15", description: "UCAS deadline for Oxford, Cambridge, and most Medicine/Dentistry/Veterinary courses", category: "deadline", track: "uk" },
  { group: "UCAS", title: "UCAS equal consideration deadline", date: "2027-01-31", description: "Final deadline for equal consideration of all UCAS applications", category: "deadline", track: "uk" },
  { group: "UCAS", title: "UCAS Extra opens", date: "2027-02-25", description: "Apply to additional courses if you hold no offers", category: "reminder", track: "uk" },
  { group: "UCAS", title: "Reply to offers deadline", date: "2027-06-05", description: "Confirm your firm and insurance choices", category: "deadline", track: "uk" },
  { group: "UCAS", title: "UCAS Clearing opens", date: "2027-07-05", description: "Clearing opens for unplaced students", category: "reminder", track: "uk" },
  { group: "Admissions Tests", title: "UCAT registration opens", date: "2026-06-01", description: "Register early for the UCAT (Medicine/Dentistry)", category: "reminder", track: "uk" },
  { group: "Admissions Tests", title: "UCAT exam window", date: "2026-07-15", description: "UCAT testing window runs from mid-July to early October", category: "deadline", track: "uk" },
  { group: "Admissions Tests", title: "MAT (Mathematics Admissions Test)", date: "2026-10-31", description: "Required for Maths, Computer Science, and related courses at Oxford and some other universities", category: "deadline", track: "uk" },
  { group: "Admissions Tests", title: "TSA (Thinking Skills Assessment)", date: "2026-10-31", description: "Required for PPE, Psychology, and other courses at Oxford", category: "deadline", track: "uk" },
  { group: "Admissions Tests", title: "PAT (Physics Aptitude Test)", date: "2026-10-31", description: "Required for Physics and Engineering at Oxford", category: "deadline", track: "uk" },
  { group: "Admissions Tests", title: "LNAT (Law National Aptitude Test)", date: "2026-10-15", description: "Required for Law at many UK universities including Oxford and UCL", category: "deadline", track: "uk" },
  { group: "Admissions Tests", title: "STEP papers (Cambridge Maths)", date: "2027-06-15", description: "STEP papers required as part of conditional offers for Cambridge Maths", category: "deadline", track: "uk" },
  { group: "Results & Offers", title: "Offers start arriving", date: "2027-02-15", description: "Universities begin sending conditional and unconditional offers", category: "milestone", track: "uk" },
  { group: "Results & Offers", title: "A-Level results day", date: "2027-08-19", description: "Receive your results and confirm your university place", category: "deadline", track: "uk" },
  { group: "Results & Offers", title: "IB results day", date: "2027-07-06", description: "International Baccalaureate results released", category: "deadline", track: "uk" },
  { group: "Personal Statement & References", title: "Begin personal statement draft", date: "2026-07-01", description: "Start brainstorming and writing your first draft", category: "milestone", track: "uk", actionLink: "/tutors", actionLabel: "Find a tutor" },
  { group: "Personal Statement & References", title: "Request academic references", date: "2026-08-01", description: "Ask teachers to prepare your UCAS references well in advance", category: "reminder", track: "uk" },
  { group: "Personal Statement & References", title: "Finalise personal statement", date: "2026-09-15", description: "Polish your personal statement and get final feedback from tutors", category: "milestone", track: "uk", actionLink: "/tutors", actionLabel: "Get tutor feedback" },
  { group: "Scholarships & Competitions", title: "Oxbridge essay competitions (various)", date: "2026-06-30", description: "Many Oxbridge colleges run essay competitions in spring/summer. Check your subject.", category: "reminder", track: "uk" },
  { group: "Scholarships & Competitions", title: "University scholarship deadlines", date: "2027-03-01", description: "Many UK universities have scholarship applications alongside or after your offer", category: "deadline", track: "uk" },

  // --- US Deadlines ---
  { group: "Common App & Applications", title: "Common Application opens", date: "2026-08-01", description: "Start filling in your Common App, Coalition App, or school-specific applications", category: "milestone", track: "us" },
  { group: "Common App & Applications", title: "Early Action deadline (most schools)", date: "2026-11-01", description: "Non-binding EA deadline. Varies by school (Nov 1-15)", category: "deadline", track: "us" },
  { group: "Common App & Applications", title: "Early Decision I deadline", date: "2026-11-01", description: "Binding ED I deadline (typically Nov 1)", category: "deadline", track: "us" },
  { group: "Common App & Applications", title: "Early Decision II deadline", date: "2027-01-01", description: "Binding ED II deadline (typically Jan 1)", category: "deadline", track: "us" },
  { group: "Common App & Applications", title: "Regular Decision deadline", date: "2027-01-01", description: "Most RD applications due between Jan 1-15", category: "deadline", track: "us" },
  { group: "Common App & Applications", title: "UC application deadline", date: "2026-11-30", description: "All University of California campuses use the same Nov 30 deadline", category: "deadline", track: "us" },
  { group: "Standardised Testing", title: "SAT exam date", date: "2026-06-06", description: "June SAT date. Register early for your preferred test center.", category: "deadline", track: "us" },
  { group: "Standardised Testing", title: "SAT exam date (Fall)", date: "2026-10-03", description: "October SAT. Last chance for many EA/ED applicants.", category: "deadline", track: "us" },
  { group: "Standardised Testing", title: "ACT exam date", date: "2026-06-13", description: "June ACT date. Register early.", category: "deadline", track: "us" },
  { group: "Standardised Testing", title: "ACT exam date (Fall)", date: "2026-10-24", description: "October ACT. Last practical date for most applications.", category: "deadline", track: "us" },
  { group: "Standardised Testing", title: "AP exams", date: "2027-05-05", description: "AP exams run over two weeks in May", category: "deadline", track: "us" },
  { group: "Standardised Testing", title: "SAT Subject Tests (if required)", date: "2026-10-03", description: "Some schools still recommend or consider SAT Subject Tests", category: "deadline", track: "us" },
  { group: "Financial Aid", title: "FAFSA opens", date: "2026-10-01", description: "The FAFSA form opens October 1. Submit as early as possible.", category: "reminder", track: "us" },
  { group: "Financial Aid", title: "CSS Profile deadline", date: "2026-11-15", description: "Many private schools require the CSS Profile for financial aid. Check each school's deadline.", category: "deadline", track: "us" },
  { group: "Financial Aid", title: "Submit FAFSA/CSS for RD schools", date: "2027-02-01", description: "Complete financial aid applications for all your target schools", category: "deadline", track: "us" },
  { group: "Financial Aid", title: "Compare financial aid packages", date: "2027-04-01", description: "Review and compare aid offers from all schools before committing", category: "milestone", track: "us" },
  { group: "Results & Decisions", title: "EA/ED I decisions released", date: "2026-12-15", description: "Most EA/ED I decisions come out by mid-December", category: "milestone", track: "us" },
  { group: "Results & Decisions", title: "ED II decisions released", date: "2027-02-15", description: "ED II results typically arrive by mid-February", category: "milestone", track: "us" },
  { group: "Results & Decisions", title: "Regular Decision results", date: "2027-03-28", description: "Most schools release RD decisions in late March to early April", category: "milestone", track: "us" },
  { group: "Results & Decisions", title: "National Decision Day", date: "2027-05-01", description: "Commit to your chosen school and submit your enrollment deposit", category: "deadline", track: "us" },
  { group: "Essays & Recommendations", title: "Start Common App personal essay", date: "2026-07-01", description: "Begin drafting your main personal essay", category: "milestone", track: "us", actionLink: "/tutors", actionLabel: "Find an essay tutor" },
  { group: "Essays & Recommendations", title: "Request letters of recommendation", date: "2026-08-15", description: "Ask teachers, counselors, and mentors well in advance", category: "reminder", track: "us" },
  { group: "Essays & Recommendations", title: "Finalise supplemental essays", date: "2026-10-15", description: "Complete and polish all supplemental essays before deadlines", category: "milestone", track: "us", actionLink: "/tutors", actionLabel: "Get tutor feedback" },
  { group: "Scholarships & Competitions", title: "QuestBridge National College Match", date: "2026-09-27", description: "QuestBridge application deadline for high-achieving, low-income students", category: "deadline", track: "us" },
  { group: "Scholarships & Competitions", title: "Merit scholarship deadlines (various)", date: "2026-12-01", description: "Many schools have separate merit scholarship applications with earlier deadlines", category: "deadline", track: "us" },
  { group: "Scholarships & Competitions", title: "External scholarship deadlines", date: "2027-03-01", description: "Apply for outside scholarships (Gates, Coca-Cola, etc.)", category: "reminder", track: "us" },
];
