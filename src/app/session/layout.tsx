import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Session",
  robots: { index: false, follow: false, nocache: true },
};

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
