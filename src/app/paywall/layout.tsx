import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upgrade",
  robots: { index: false, follow: false },
};

export default function PaywallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
