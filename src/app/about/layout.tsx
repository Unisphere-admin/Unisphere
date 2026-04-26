import type { Metadata } from "next";

export const metadata: Metadata = {
  // Root layout's title.template appends " | Unisphere" automatically.
  title: "About Us",
  description:
    "Meet the Unisphere team. We connect students with experienced admissions tutors to help them earn offers from the world's top universities.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Unisphere",
    description:
      "Meet the Unisphere team and learn how we help students earn offers from top universities.",
    type: "website",
    url: "/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
