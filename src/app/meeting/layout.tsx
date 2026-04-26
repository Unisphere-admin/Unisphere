import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meeting",
  // Live tutoring sessions — never index.
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default function MeetingRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
