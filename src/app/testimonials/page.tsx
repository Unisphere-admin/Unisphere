"use client";

import Image from "next/image";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { InteractiveGridBackground, InteractiveGridOverlay } from "@/components/ui/interactive-grid";

/* ═══════════════════════════════════════════════════════════════════
   LETTER SPLIT
   Per-letter staggered reveal with a blur-to-clear focus pull.
   Echoes the summer-studio hero title so the two pages share language.
   ═══════════════════════════════════════════════════════════════════ */

function LetterSplit({
  text,
  delay = 0,
  gradient = false,
  italic = false,
  className = "",
  style,
}: {
  text: string;
  delay?: number;
  gradient?: boolean;
  italic?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [visibleLetters, setVisibleLetters] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    text.split("").forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleLetters((prev) => {
          const next = new Set(prev);
          next.add(i);
          return next;
        });
      }, delay + i * 55);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [delay, text]);

  // Base typography (italic / family) goes on the wrapper; the GRADIENT must
  // be applied per-letter, because each letter is a `display: inline-block`
  // element that creates its own background-clip rendering context. If we put
  // the gradient on the wrapper the children all render transparent.
  const wrapperStyle: CSSProperties = {
    ...(italic
      ? { fontStyle: "italic", fontFamily: "var(--font-playfair)", fontWeight: 400 }
      : {}),
    ...style,
  };

  const letterGradientStyle: CSSProperties = gradient
    ? {
        // Very slow, calm drift between dark navy-blue shades with a subtle
        // lighter-blue hint passing through. Not shining. Think of it as the
        // word quietly breathing through deeper and lighter tones of the
        // same blue family over 14 seconds.
        background:
          "linear-gradient(135deg, #0a2a3a 0%, #123f5f 25%, #1f6488 45%, #b9d4e1 50%, #1f6488 55%, #123f5f 75%, #0a2a3a 100%)",
        backgroundSize: "350% 350%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        animation: "ts-title-gradient 14s ease-in-out infinite",
      }
    : {};

  return (
    <span className={className} style={wrapperStyle}>
      {text.split("").map((ch, i) => {
        const visible = visibleLetters.has(i);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: visible ? 1 : 0,
              transform: visible
                ? "translateY(0) scale(1)"
                : "translateY(24px) scale(0.82)",
              filter: visible ? "blur(0)" : "blur(10px)",
              transition:
                "opacity 900ms cubic-bezier(0.2,1,0.3,1), transform 900ms cubic-bezier(0.2,1,0.3,1), filter 900ms ease",
              whiteSpace: ch === " " ? "pre" : "normal",
              ...letterGradientStyle,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STORY DATA  —  one entry per student. Each renders as its own section
   with the same cinematic reveal: massive figure at centre, then shrinks
   and slides left while the universities + quote panel fade in.
   ═══════════════════════════════════════════════════════════════════ */

type Offer = { name: string; src: string | null; short?: string };

type Story = {
  id: string;
  name: string;
  meta: string;
  photo: string;
  offers: readonly Offer[];
  programme: readonly string[];
  quotes: readonly string[];
};

const STORIES: readonly Story[] = [
  {
    id: "aidan-lee",
    name: "Aidan Lee",
    meta: "2025-2026 Application Cycle",
    photo: "/headshots/AidanLee-cutout.webp",
    offers: [
      { name: "Princeton University", src: "/Unilogos/Princeton Logo.png" },
      // Dartmouth logo PNG not in the project yet — placeholder tile until it lands.
      { name: "Dartmouth College",    src: null, short: "D" },
      { name: "Brown University",     src: "/Unilogos/Brown Logo.png" },
      { name: "Columbia University",  src: "/Unilogos/Columbia Logo.png" },
    ],
    programme: [
      "US Admissions",
      "Essay Writing",
      "Extracurricular Building",
    ],
    quotes: [
      "When I first started my essay, it was all over the place. Gha Yuan helped me pull it together and focus on the topics that actually mattered to me.",
      "Gha Yuan was sharp and pragmatic with my US university applications. She kept me focused and never wasted a session.",
      "The advice that stuck with me most was thinking about what made me different from anyone else with a similar background. That reflection became the theme of my whole application, not just my Common App essay.",
    ],
  },
  {
    id: "andrew-zheng",
    name: "Andrew Zheng",
    meta: "2025-2026 Application Cycle",
    photo: "/headshots/AndrewZheng-cutout.webp",
    offers: [
      // Three of these schools don't have logo PNGs yet — they render as letter
      // placeholder tiles until /public/Unilogos/{School} Logo.png is added.
      { name: "Carnegie Mellon",  src: null, short: "CMU" },
      { name: "Cornell University", src: "/Unilogos/Cornell Logo.png" },
      { name: "Dartmouth College", src: null, short: "D" },
      { name: "Vanderbilt",       src: null, short: "V" },
    ],
    /* Programme tags rendered under WORKED ON for Andrew. */
    programme: [
      "US Admissions",
      "Essay Writing",
      "Extracurricular Building",
    ],
    quotes: [
      // TODO: replace with Andrew's real quotes
      "Quote coming soon.",
    ],
  },
  {
    id: "anonymous-1",
    name: "Anonymous",
    meta: "Anonymous Student",
    photo: "/headshots/LY-cutout.webp",
    offers: [
      // Anonymous student — UCLA confirmed; remaining tiles still placeholders
      // until the user provides the rest of the offers.
      { name: "UCLA", src: "/Unilogos/UCLA Logo.png" },
      { name: "TBD", src: null, short: "?" },
      { name: "TBD", src: null, short: "?" },
      { name: "TBD", src: null, short: "?" },
    ],
    programme: [
      "TBD",
    ],
    quotes: [
      "Quote coming soon.",
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   PAGE
   Choreographed entrance:
     t=0.10s  kicker fades up
     t=0.40s  "Our" letters cascade in
     t=0.70s  "Students" cascades in (italic gradient)
     t=1.50s  subtitle eases in
     t=1.80s  Aidan pops from scale 0.55 + blur(28px) to full
     t=3.70s  Aidan slides left (scale 0.90) with GPU-composited transform
     t=4.30s  right panel (story) reveals item-by-item with 120ms stagger
   ═══════════════════════════════════════════════════════════════════ */

export default function TestimonialsPage() {
  // Title hero only. Each student section manages its own reveal locally
  // via an IntersectionObserver inside StudentTestimonial.
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <InteractiveGridBackground variant="teal" />
      <InteractiveGridOverlay />

      <div className="with-navbar w-full relative" style={{ zIndex: 1 }}>
        <div className="container max-w-screen-xl mx-auto px-4 md:px-6 w-full relative z-10">

          {/* ─────────── Title block ─────────── */}
          <section className="pt-12 md:pt-16 pb-6 md:pb-10 relative">
            <div className="max-w-3xl mx-auto text-center">
              <p
                className="text-xs md:text-sm font-bold tracking-[0.28em] uppercase text-[#062538] mb-4"
                style={{
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "translateY(0)" : "translateY(14px)",
                  transition: "all 800ms cubic-bezier(0.2,1,0.3,1)",
                }}
              >
                Where They Got In
              </p>

              <h1
                className="font-bold leading-[0.95] tracking-tight text-[#0b2b3a]"
                style={{ fontSize: "clamp(3.5rem, 7vw, 5.5rem)" }}
              >
                <LetterSplit text="Our " delay={400} />
                {/* Solid dark navy italic — no gradient, no shimmer, just a
                    clean typographic contrast with the bold sans "Our". */}
                <LetterSplit
                  text="Students"
                  delay={700}
                  italic
                  style={{
                    fontSize: "1.08em",
                    letterSpacing: "-0.01em",
                    color: "#0a2a3a",
                  }}
                />
              </h1>

              <p
                className="mt-5 md:mt-6 text-sm md:text-base lg:text-lg font-medium text-[#2d5a6a]/85 max-w-xl mx-auto leading-relaxed"
                style={{
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "translateY(0)" : "translateY(16px)",
                  filter: heroReady ? "blur(0)" : "blur(3px)",
                  transition: "all 900ms cubic-bezier(0.2,1,0.3,1) 1400ms",
                }}
              >
                Real offers, real stories from the Unisphere community.
              </p>
            </div>
          </section>

          {/* ─────────── Student testimonials ─────────── */}
          {STORIES.map((story, i) => (
            <StudentTestimonial
              key={story.id}
              story={story}
              /* First student loads its image with priority + waits ~1.7s after
                 page load before revealing so the title hero finishes first.
                 Subsequent students start their reveal immediately when they
                 scroll into view. */
              priority={i === 0}
              initialDelay={i === 0 ? 1700 : 0}
            />
          ))}

          {/* ─────────── Footer ─────────── */}
          <section className="py-20 md:py-28 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0e6480]/70">
              More stories coming soon
            </p>
          </section>
        </div>
      </div>

      {/* Global keyframes */}
      <style jsx global>{`
        @keyframes ts-title-gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        /* Shimmer: slides the bright white highlight across the word from
           right to left, continuously. The 220 percent background-size means
           the full gradient is wider than the word, so we translate it by
           one full extra width per cycle for a smooth unbroken sweep. */
        @keyframes ts-title-shimmer {
          0% {
            background-position: 110% 0%;
          }
          100% {
            background-position: -110% 0%;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STUDENT TESTIMONIAL
   One stacked section per student. Reveal fires when the section scrolls
   into view, on the same three-phase timing as the original Aidan reveal:
     +0ms      figure scales up at centre (massive)
     +1900ms   figure shrinks and slides left, halo follows
     +3200ms   universities + quote + programme cascade in on the right
   First student passes initialDelay=1700 so the title hero finishes its
   cascade before he begins. Subsequent students fire as soon as they
   intersect the viewport.
   ═══════════════════════════════════════════════════════════════════ */

function StudentTestimonial({
  story,
  priority = false,
  initialDelay = 0,
}: {
  story: Story;
  priority?: boolean;
  initialDelay?: number;
}) {
  const [entered, setEntered] = useState(false);
  const [slid, setSlid] = useState(false);
  const [storyIn, setStoryIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const triggeredRef = useRef(false);

  // Track viewport so the mobile/desktop layouts pick the right transforms.
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Trigger the reveal sequence when the section first enters the viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || triggeredRef.current) return;
        triggeredRef.current = true;
        const a = setTimeout(() => setEntered(true), initialDelay);
        const b = setTimeout(() => setSlid(true), initialDelay + 1900);
        const c = setTimeout(() => setStoryIn(true), initialDelay + 3200);
        // We could capture and clean these timers, but the section unmount
        // path is page-level navigation; the timers fire long before that.
        void [a, b, c];
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [initialDelay]);

  return (
    <div ref={sectionRef}>
      {/* DESKTOP LAYOUT */}
      <section className="hidden md:block relative" style={{ minHeight: "820px" }}>
        {/* Spotlight halo that tracks with the figure as they slide.
            Larger when at center (matching massive scale), smaller once moved left. */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "50%",
            left: slid ? "calc(50% - 22vw)" : "50%",
            width: slid ? "460px" : "680px",
            height: slid ? "460px" : "680px",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(18,140,160,0.28) 0%, rgba(45,175,235,0.12) 40%, transparent 75%)",
            opacity: entered ? 1 : 0,
            transition:
              "opacity 1200ms ease, left 1600ms cubic-bezier(0.19,1,0.22,1), width 1600ms cubic-bezier(0.19,1,0.22,1), height 1600ms cubic-bezier(0.19,1,0.22,1)",
            zIndex: 5,
          }}
        />

        {/* Figure cutout — enters MASSIVE at centre, then simultaneously
            shrinks and slides left to its final resting position. Single
            transition so the shrink + slide feel like one continuous move. */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "420px",
            height: "562px",
            transform: slid
              ? "translate(calc(-50% - 22vw), -50%) scale(1.25)"
              : entered
              ? "translate(-50%, -50%) scale(1.4)"
              : "translate(-50%, -50%) scale(0.45)",
            opacity: entered ? 1 : 0,
            filter: entered ? "blur(0)" : "blur(32px)",
            transition:
              "transform 1600ms cubic-bezier(0.19,1,0.22,1), opacity 1400ms ease, filter 1100ms ease",
            willChange: "transform, opacity, filter",
            zIndex: 10,
          }}
        >
          <Image
            src={story.photo}
            alt={story.name}
            fill
            sizes="420px"
            priority={priority}
            className="object-contain"
            style={{
              filter: "drop-shadow(0 20px 40px rgba(11,43,58,0.18))",
            }}
          />
        </div>

        {/* Story panel — right column, slides in after figure moves */}
        <div
          className="absolute"
          style={{
            top: "50%",
            right: "4%",
            width: "46%",
            maxWidth: "600px",
            transform: "translateY(-50%)",
            zIndex: 6,
          }}
        >
          <StoryPanel story={story} inView={storyIn} isMobile={false} />
        </div>
      </section>

      {/* MOBILE LAYOUT */}
      <section className="md:hidden relative pt-3 pb-8">
        {/* Meta + Name header, above the picture */}
        <div
          className="text-center mb-6"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(14px)",
            transition: "all 900ms cubic-bezier(0.2,1,0.3,1)",
          }}
        >
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.26em] text-[#062538] mb-2">
            {story.meta}
          </p>
          <h2 className="text-[2.5rem] font-bold text-[#0b2b3a] tracking-tight leading-none">
            {story.name}
          </h2>
        </div>

        {/* Picture (left) + Universities stacked (right) */}
        <div className="flex items-start gap-3">
          <div
            className="relative flex-shrink-0"
            style={{
              width: "58%",
              transform: slid
                ? "translateX(0) scale(1)"
                : entered
                ? "translateX(21vw) scale(1.4)"
                : "translateX(21vw) scale(0.5)",
              opacity: entered ? 1 : 0,
              filter: entered ? "blur(0)" : "blur(18px)",
              transition:
                "transform 1500ms cubic-bezier(0.19,1,0.22,1), opacity 1200ms ease, filter 1000ms ease",
              willChange: "transform, opacity, filter",
              zIndex: 5,
            }}
          >
            {/* Soft halo behind the figure */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, rgba(18,140,160,0.25) 0%, rgba(45,175,235,0.10) 45%, transparent 72%)",
                opacity: entered ? 1 : 0,
                transition: "opacity 1000ms ease",
                transform: "scale(1.25)",
              }}
            />
            <div className="relative aspect-[0.747] w-full">
              <Image
                src={story.photo}
                alt={story.name}
                fill
                sizes="(max-width: 768px) 80vw, 48vw"
                priority={priority}
                className="object-contain"
                style={{
                  filter: "drop-shadow(0 14px 28px rgba(11,43,58,0.20))",
                }}
              />
            </div>
          </div>

          {/* Universities column — stacked vertically, logo + name per row */}
          <div className="flex-1 flex flex-col gap-2.5 pt-1">
            <p
              className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#0e6480] mb-1"
              style={{
                opacity: slid ? 1 : 0,
                transform: slid ? "translateX(0)" : "translateX(16px)",
                transition: "all 600ms cubic-bezier(0.2,1,0.3,1)",
              }}
            >
              Offers Received
            </p>
            {story.offers.map((uni, i) => (
              <div
                key={`${uni.name}-${i}`}
                className="flex items-center gap-2.5"
                style={{
                  opacity: slid ? 1 : 0,
                  transform: slid ? "translateX(0)" : "translateX(22px)",
                  transition: `opacity 650ms cubic-bezier(0.2,1,0.3,1) ${140 + i * 110}ms, transform 650ms cubic-bezier(0.2,1,0.3,1) ${140 + i * 110}ms`,
                }}
              >
                {uni.src ? (
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-white shadow-[0_6px_14px_-2px_rgba(11,43,58,0.18)] flex-shrink-0">
                    <Image
                      src={uni.src}
                      alt={uni.name}
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#0e6480] text-white text-base font-bold shadow-[0_6px_14px_-2px_rgba(11,43,58,0.18)] flex-shrink-0">
                    {uni.short ?? uni.name.slice(0, 1)}
                  </div>
                )}
                <span className="text-[0.78rem] font-semibold text-[#0b2b3a] leading-tight">
                  {uni.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quote rotator */}
        <div
          className="mt-8"
          style={{
            opacity: storyIn ? 1 : 0,
            transform: storyIn ? "translateY(0)" : "translateY(14px)",
            transition: "all 900ms cubic-bezier(0.2,1,0.3,1)",
          }}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex-shrink-0 mt-2 w-8 h-[2px] bg-[#128ca0]"
              style={{
                transformOrigin: "left center",
                transform: storyIn ? "scaleX(1)" : "scaleX(0)",
                transition: "transform 900ms cubic-bezier(0.2,1,0.3,1) 150ms",
              }}
            />
            <QuoteRotator quotes={story.quotes} isMobile={true} />
          </div>
        </div>

        {/* Worked On chips */}
        <div
          className="mt-5"
          style={{
            opacity: storyIn ? 1 : 0,
            transform: storyIn ? "translateY(0)" : "translateY(12px)",
            transition: "all 900ms cubic-bezier(0.2,1,0.3,1) 400ms",
          }}
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#0e6480] mb-3">
            Worked On
          </p>
          <div className="flex flex-wrap gap-2">
            {story.programme.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#128ca0]/10 text-[#1e4556] border border-[#128ca0]/15"
                style={{
                  opacity: storyIn ? 1 : 0,
                  transform: storyIn ? "translateY(0)" : "translateY(6px)",
                  transition: `opacity 500ms cubic-bezier(0.2,1,0.3,1) ${500 + i * 80}ms, transform 500ms cubic-bezier(0.2,1,0.3,1) ${500 + i * 80}ms`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STORY PANEL
   Appears item-by-item with a 120ms stagger once `inView` is true.
   Each block has its own delay so the reveal feels like an editorial
   typesetter laying out a profile page, one line at a time.
   ═══════════════════════════════════════════════════════════════════ */

function StoryPanel({
  story,
  inView,
  isMobile,
}: {
  story: Story;
  inView: boolean;
  isMobile: boolean;
}) {
  const align = isMobile ? "text-center" : "text-left";
  const alignFlex = isMobile ? "justify-center" : "justify-start";

  const reveal = (delay: number, extra: CSSProperties = {}): CSSProperties => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "translate(0, 0)" : "translate(32px, 8px)",
    transition: `opacity 1000ms cubic-bezier(0.2,1,0.3,1) ${delay}ms, transform 1000ms cubic-bezier(0.2,1,0.3,1) ${delay}ms`,
    ...extra,
  });

  return (
    <div className={align}>
      {/* Meta line */}
      <p
        className="text-[0.7rem] md:text-xs font-semibold uppercase tracking-[0.26em] text-[#0e6480]"
        style={reveal(0)}
      >
        {story.meta}
      </p>

      {/* Name — hero of the panel */}
      <h2
        className="mt-2 md:mt-3 font-bold text-[#0b2b3a] tracking-tight leading-[0.95]"
        style={{
          fontSize: isMobile ? "3rem" : "clamp(3.5rem, 7vw, 6rem)",
          ...reveal(140),
        }}
      >
        {story.name}
      </h2>

      {/* Offers received — logo on top, name below. Bigger tiles (~2x)
          with a layered drop shadow. On mobile the 4 tiles break into 2x2
          so they don't overflow the container at the larger size. */}
      <div className="mt-6 md:mt-7" style={reveal(260)}>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#0e6480] mb-5">
          Offers Received
        </p>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 ${isMobile ? "max-w-[360px] mx-auto" : ""}`}>
          {story.offers.map((uni, i) => (
            <div
              key={`${uni.name}-${i}`}
              className="flex flex-col items-center gap-3 md:gap-3.5"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(10px)",
                transition: `opacity 700ms cubic-bezier(0.2,1,0.3,1) ${430 + i * 90}ms, transform 700ms cubic-bezier(0.2,1,0.3,1) ${430 + i * 90}ms`,
              }}
            >
              {uni.src ? (
                <div className="w-[112px] h-[112px] md:w-[118px] md:h-[118px] rounded-2xl overflow-hidden bg-white shadow-[0_14px_32px_-6px_rgba(11,43,58,0.22),0_4px_12px_rgba(18,140,160,0.10)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(11,43,58,0.28),0_6px_16px_rgba(18,140,160,0.14)]">
                  <Image
                    src={uni.src}
                    alt={uni.name}
                    width={260}
                    height={260}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                /* Dartmouth placeholder until logo is dropped in. Matches the
                   sized + rounded + shadow of the real logo tiles exactly. */
                <div className="w-[112px] h-[112px] md:w-[118px] md:h-[118px] rounded-2xl flex items-center justify-center bg-[#0e6480] text-white text-[2.5rem] md:text-[2.75rem] font-bold shadow-[0_14px_32px_-6px_rgba(11,43,58,0.22),0_4px_12px_rgba(18,140,160,0.10)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-6px_rgba(11,43,58,0.28),0_6px_16px_rgba(18,140,160,0.14)]">
                  {uni.short ?? uni.name.slice(0, 1)}
                </div>
              )}
              <span className="text-sm md:text-base font-semibold text-[#0b2b3a] text-center leading-tight">
                {uni.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quote carousel — rotates every 7s, clickable dots below. */}
      <div
        className={`mt-8 md:mt-10 ${isMobile ? "mx-auto" : ""}`}
        style={{ maxWidth: isMobile ? "100%" : "480px" }}
      >
        <div
          className={`flex items-start gap-3 ${isMobile ? "justify-center" : ""}`}
          style={reveal(900)}
        >
          <span
            aria-hidden
            className="flex-shrink-0 mt-2 w-8 h-[2px] bg-[#128ca0]"
            style={{
              transformOrigin: "left center",
              transform: inView ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 900ms cubic-bezier(0.2,1,0.3,1) 950ms",
            }}
          />
          <QuoteRotator quotes={story.quotes} isMobile={isMobile} />
        </div>
      </div>

      {/* Programme tags */}
      <div className="mt-5 md:mt-6" style={reveal(1150)}>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#0e6480] mb-3">
          Worked On
        </p>
        <div className={`flex flex-wrap gap-2 ${alignFlex}`}>
          {story.programme.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-[#128ca0]/10 text-[#1e4556] border border-[#128ca0]/15"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(8px)",
                transition: `opacity 600ms cubic-bezier(0.2,1,0.3,1) ${1220 + i * 80}ms, transform 600ms cubic-bezier(0.2,1,0.3,1) ${1220 + i * 80}ms`,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QUOTE ROTATOR
   Crossfades between several pull-quotes on a fixed interval. Clickable
   dots below let the reader jump directly. Minimum height is set large
   enough for the longest quote so the layout never jumps.
   ═══════════════════════════════════════════════════════════════════ */

function QuoteRotator({
  quotes,
  isMobile,
}: {
  quotes: readonly string[];
  isMobile: boolean;
}) {
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);

  // Pause auto-rotation when the quote block is scrolled off-screen so we do
  // not burn a setInterval tick on work nobody can see.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-rotate every 6 seconds. No pause-on-hover so the rotation keeps
  // going whether the user is reading or scrolling.
  useEffect(() => {
    if (quotes.length < 2) return;
    const interval = setInterval(() => {
      if (!visibleRef.current) return;
      setActive((prev) => (prev + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  // Tight minimum sized to the longest quote with only a tiny buffer so the
  // dots sit close to the end of the text instead of floating in dead space.
  const minHeight = isMobile ? "138px" : "100px";

  return (
    <div className="flex-1" ref={rootRef}>
      <div className="relative" style={{ minHeight }}>
        {quotes.map((q, i) => (
          <p
            key={i}
            className="absolute inset-0 text-[0.98rem] md:text-[1.05rem] font-medium leading-snug text-[#0b2b3a]"
            style={{
              opacity: active === i ? 1 : 0,
              transform: active === i ? "translateY(0)" : "translateY(6px)",
              transition:
                "opacity 700ms cubic-bezier(0.2,1,0.3,1), transform 700ms cubic-bezier(0.2,1,0.3,1)",
              pointerEvents: active === i ? "auto" : "none",
            }}
          >
            &ldquo;{q}&rdquo;
          </p>
        ))}
      </div>

      {quotes.length > 1 && (
        <div className={`flex gap-1.5 mt-1.5 ${isMobile ? "justify-center" : ""}`}>
          {quotes.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show quote ${i + 1} of ${quotes.length}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                active === i
                  ? "w-6 bg-[#128ca0]"
                  : "w-1.5 bg-[#128ca0]/30 hover:bg-[#128ca0]/55"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
