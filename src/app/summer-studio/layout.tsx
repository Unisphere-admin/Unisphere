import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Summer Studio",
  description:
    "Unisphere Summer Studio: a project-based summer programme that turns student passions into stand-out portfolio pieces for university applications.",
  alternates: { canonical: "/summer-studio" },
  openGraph: {
    title: "Summer Studio | Unisphere",
    description:
      "A project-based summer programme that turns student passions into stand-out portfolio pieces.",
    type: "website",
    url: "/summer-studio",
  },
};

export default function SummerStudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
