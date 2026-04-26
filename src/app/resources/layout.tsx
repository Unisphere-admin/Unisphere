import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Free admissions guides, essay templates, deadline trackers, and study materials curated by Unisphere tutors.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Resources | Unisphere",
    description:
      "Free admissions guides, essay templates, deadline trackers, and study materials.",
    type: "website",
    url: "/resources",
  },
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
