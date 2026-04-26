import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Tutor",
  description:
    "Earn money helping the next generation of students get into top universities. Apply to tutor with Unisphere.",
  alternates: { canonical: "/become-a-tutor" },
  openGraph: {
    title: "Become a Tutor | Unisphere",
    description:
      "Earn money helping the next generation of students get into top universities.",
    type: "website",
    url: "/become-a-tutor",
  },
};

export default function BecomeATutorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
