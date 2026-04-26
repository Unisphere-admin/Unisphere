import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Confirmed",
  robots: { index: false, follow: false, nocache: true },
};

export default function CreditsSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
