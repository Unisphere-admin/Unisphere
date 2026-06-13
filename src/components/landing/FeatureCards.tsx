import Link from "next/link";
import { ArrowRight, Quote, Tag, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Three-card feature section on the landing page.
 *
 * Each card previews a key part of the product and is itself a link to
 * that page:
 *   1. Real testimonials from students who got in.
 *   2. The credits pricing page.
 *   3. Free study resources, gated only by signing up.
 *
 * Layout: a heading with a Playfair italic accent (matching the hero
 * "Dream" word), a short intro, then three pastel cards in a row on
 * desktop, stacked on mobile. Each card lifts on hover and routes to
 * its own page.
 */

type Card = {
  title: string;
  body: string;
  /** Where the whole card navigates to when clicked. */
  href: string;
  /** Call-to-action label rendered under the body. */
  cta: string;
  /** Lucide icon shown in the lower illustration slot. */
  icon: LucideIcon;
  bg: string;
  border: string;
  titleColor: string;
  bodyColor: string;
  slotBg: string;
};

const CARDS: Card[] = [
  {
    // ── Testimonials — mint ──────────────────────────────────────────
    title: "What our students say",
    body: "Real stories from international students who landed offers at Oxford, MIT, Cambridge and beyond. Read how they got in.",
    href: "/testimonials",
    cta: "Read their stories",
    icon: Quote,
    bg: "#d3efe6",
    border: "#a3d9cc",
    titleColor: "#0e7c6e",
    bodyColor: "#3d5852",
    slotBg: "rgba(255,255,255,0.6)",
  },
  {
    // ── Pricing — teal ───────────────────────────────────────────────
    title: "Simple, honest pricing",
    body: "Pay only for what you use. Buy credits, then spend them on messaging tutors and booking sessions. No subscriptions, no surprises.",
    href: "/credits",
    cta: "See our pricing",
    icon: Tag,
    bg: "#daf0f1",
    border: "#bcdde0",
    titleColor: "#128ca0",
    bodyColor: "#46606a",
    slotBg: "rgba(255,255,255,0.6)",
  },
  {
    // ── Free resources — blue ────────────────────────────────────────
    title: "Free resources, just sign up",
    body: "Study guides, application templates, and exam prep, all completely free. The only thing we ask is a quick sign-up.",
    href: "/signup",
    cta: "Sign up to unlock",
    icon: BookOpen,
    bg: "#e6ebfb",
    border: "#c5cef0",
    titleColor: "#3f5bb0",
    bodyColor: "#4b5677",
    slotBg: "rgba(255,255,255,0.6)",
  },
];

export function FeatureCards() {
  return (
    <section className="w-full bg-[#f8fafa] border-t border-[#c2d8d2]/30 py-20 md:py-28">
      <div className="container mx-auto px-6 md:px-10 max-w-screen-xl">

        {/* ── Heading ──────────────────────────────────────────────────
            The accent phrase uses the Playfair italic treatment to match
            the "Dream" word in the hero headline. */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 className="font-bold tracking-tight text-[2.25rem] md:text-5xl text-foreground leading-tight">
            Get to know{" "}
            <span
              className="italic"
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 400,
                color: "#128ca0",
              }}
            >
              Unisphere
            </span>
          </h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            Hear from students who made it, see how our pricing works, and
            tap into our free study resources.
          </p>
        </div>

        {/* ── Cards ────────────────────────────────────────────────────
            `md:grid-cols-3` lays the three cards in a single row on
            desktop and stacks them in a single column on mobile. Grid
            items stretch to equal height per row, and each card pins its
            icon slot to the bottom so the slots line up. */}
        <div className="grid gap-6 md:gap-7 md:grid-cols-3">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link
                key={i}
                href={card.href}
                className="group flex flex-col rounded-3xl border-2 p-7 md:p-8 transition-all duration-300 hover:shadow-[0_16px_40px_-16px_rgba(18,140,160,0.28)] hover:-translate-y-1"
                style={{ backgroundColor: card.bg, borderColor: card.border }}
              >
                <h3
                  className="text-[1.6rem] md:text-[1.8rem] font-bold mb-3 leading-tight"
                  style={{ color: card.titleColor }}
                >
                  {card.title}
                </h3>

                <p
                  className="text-[0.95rem] leading-relaxed"
                  style={{ color: card.bodyColor }}
                >
                  {card.body}
                </p>

                <div className="mt-5">
                  <span
                    className="inline-flex items-center gap-2 text-sm font-semibold transition-transform duration-200 group-hover:translate-x-0.5"
                    style={{ color: card.titleColor }}
                  >
                    {card.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>

                {/* Icon slot — `mt-auto` pins it to the bottom of the
                    card so the slots line up across the row. */}
                <div className="mt-auto pt-6">
                  <div
                    className="flex h-44 w-full items-center justify-center rounded-2xl border"
                    style={{
                      backgroundColor: card.slotBg,
                      borderColor: card.border,
                    }}
                  >
                    <Icon
                      className="h-14 w-14"
                      style={{ color: card.titleColor }}
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
