import React from "react";

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pt-[var(--navbar-height)]">
      {children}
    </div>
  );
} 