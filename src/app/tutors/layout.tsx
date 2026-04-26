import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Tutors",
  description:
    "Find admissions tutors who got into Princeton, Cornell, Oxford and more. Book essay reviews, application strategy, and interview prep.",
  alternates: { canonical: "/tutors" },
  openGraph: {
    title: "Browse Tutors | Unisphere",
    description:
      "Find admissions tutors who got into Princeton, Cornell, Oxford and more.",
    type: "website",
    url: "/tutors",
  },
};

export default function TutorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
