import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits",
  description: "Top up Unisphere credits to book admissions tutoring sessions.",
  robots: { index: false, follow: false },
};

export default function CreditsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
