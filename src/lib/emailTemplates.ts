// Email template registry
// Add new templates here as you create them

export interface EmailTemplate {
  id: string;
  title: string;
  description: string;
  fileName: string; // file in /public/emails/
  subject: string;
  createdAt: string;
  category: "announcement" | "marketing" | "re-engagement" | "event" | "reminder";
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "were-back",
    title: "We're Back",
    description:
      "Announce the return of Unisphere with redesigned platform, Summer Studio, and new mentors.",
    fileName: "were-back.html",
    subject: "We're Back. And Better Than Ever.",
    createdAt: "2026-03-31",
    category: "announcement",
  },
  {
    id: "free-consultation",
    title: "Free Consultation",
    description:
      "Personal outreach inviting eligible users to book a free 30-minute consultation with a founder via Calendly.",
    fileName: "free-consultation.html",
    subject: "You are eligible for a free consultation with our founders.",
    createdAt: "2026-04-02",
    category: "announcement",
  },
  {
    id: "you-still-have-credit",
    title: "You Still Have Credit",
    description:
      "Re-engagement email reminding users with unused credits to book a session with a tutor.",
    fileName: "you-still-have-credit.html",
    subject: "Hey - you still have credit with us.",
    createdAt: "2026-04-02",
    category: "re-engagement",
  },
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}
