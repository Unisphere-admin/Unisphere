import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Testimonials",
  description:
    "Real offers, real stories. Hear from Unisphere students who earned places at Princeton, Cornell, Carnegie Mellon, Vanderbilt and more.",
  alternates: { canonical: "/testimonials" },
  openGraph: {
    title: "Student Testimonials | Unisphere",
    description:
      "Real offers, real stories from Unisphere students.",
    type: "website",
    url: "/testimonials",
  },
};

/**
 * JSON-LD ItemList of testimonials. Helps Google understand each entry as a
 * Person + their associated university offers, which can surface as rich
 * results in search and as snippets in AI-generated answers.
 */
const testimonialsSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "Person",
        name: "Aidan Lee",
        description:
          "Unisphere student, 2025-2026 application cycle. Received offers from Princeton, Dartmouth, Brown, and Columbia.",
        affiliation: [
          { "@type": "CollegeOrUniversity", name: "Princeton University" },
          { "@type": "CollegeOrUniversity", name: "Dartmouth College" },
          { "@type": "CollegeOrUniversity", name: "Brown University" },
          { "@type": "CollegeOrUniversity", name: "Columbia University" },
        ],
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "Person",
        name: "Andrew Zheng",
        description:
          "Unisphere student, 2025-2026 application cycle. Received offers from Carnegie Mellon, Cornell, Dartmouth, and Vanderbilt.",
        affiliation: [
          { "@type": "CollegeOrUniversity", name: "Carnegie Mellon University" },
          { "@type": "CollegeOrUniversity", name: "Cornell University" },
          { "@type": "CollegeOrUniversity", name: "Dartmouth College" },
          { "@type": "CollegeOrUniversity", name: "Vanderbilt University" },
        ],
      },
    },
  ],
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(testimonialsSchema) }}
      />
      {children}
    </>
  );
}
