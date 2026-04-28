"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { FlipWords } from "@/components/ui/flip-words";
import { UniversityOrbit } from "@/components/landing/UniversityOrbit";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ScrollStep = dynamic(
  () => import("@/components/landing/BelowFoldSections").then(m => ({ default: m.ScrollStep })),
  { ssr: false }
);

const RevolvingCards = dynamic(
  () => import("@/components/landing/RevolvingCards").then(m => ({ default: m.RevolvingCards })),
  { ssr: false }
);

const ChatGraphic = dynamic(
  () => import("@/components/landing/ChatGraphic").then(m => ({ default: m.ChatGraphic })),
  { ssr: false }
);

const SummerStudioBanner = dynamic(
  () => import("@/components/landing/SummerStudioBanner").then(m => ({ default: m.SummerStudioBanner })),
  { ssr: false }
);

const TestimonialsBanner = dynamic(
  () => import("@/components/landing/TestimonialsBanner").then(m => ({ default: m.TestimonialsBanner })),
  { ssr: false }
);

const MobileHeroLogoStack = dynamic(
  () => import("@/components/landing/MobileHeroLogoStack").then(m => ({ default: m.MobileHeroLogoStack })),
  { ssr: false }
);

export default function HomePage() { 
  const flipWords = ["Oxbridge Interviews", "Personal Statements", "Essays", "Admissions Tests", "ACT/SAT"];

  const { user } = useAuth();

  return (
    <div className="flex flex-col w-full with-navbar">
      {/* Hero Section */}
      <section className="relative py-8 pb-12 md:py-16 bg-white">

        {/* Mobile-only floating logo stack on the right side of the hero.
            Positioned absolutely so it overlays without pushing or wrapping
            the hero text. The hero <section> is the positioning context. */}
        <MobileHeroLogoStack />

        <div className="container relative z-10 mx-auto px-6 md:px-10 max-w-screen-xl h-full">
          <div className="flex flex-col md:flex-row gap-0 items-center h-full">
            {/* On mobile, reserve ~120px on the right of the text column so
                the headline never collides with the absolutely-positioned
                MobileHeroLogoStack orbit (which sits pinned to the right edge
                near the "Dream" word). On md+ the orbit doesn't exist and we
                use UniversityOrbit in a separate flex column instead — no
                padding needed there. */}
            <div className="flex-[3] space-y-6 text-left pr-[120px] md:pr-0">

              <h1
                className="font-bold tracking-tight text-[3rem] sm:text-[3.25rem] md:text-6xl text-left"
                style={{ lineHeight: 1.05 }}
              >
                <span className="block hero-anim-init hero-anim-line" style={{ animationDelay: '0.10s' }}>We Help</span>
                <span className="block text-[3.3rem] sm:text-[3.55rem] md:text-6xl hero-anim-init hero-anim-line" style={{ animationDelay: '0.30s' }}>International Students</span>
                <span className="block hero-anim-init hero-anim-line" style={{ animationDelay: '0.50s' }}>Land Their</span>
                <span className="block">
                  <span
                    className="inline-block dream-gradient text-[3.6rem] sm:text-[3.9rem] md:text-[4.125rem]"
                    style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontWeight: 400, lineHeight: 1.15 }}
                    aria-label="Dream"
                  >
                    {/* Each letter snaps in instantly on its own delay, so
                        the word literally appears one letter at a time:
                        D … r … e … a … m. The letters stay inline (no
                        inline-block) so the parent's text-clip gradient
                        flows across the whole word as one continuous fill. */}
                    <span className="dream-letter" style={{ animationDelay: '0.85s' }}>D</span>
                    <span className="dream-letter" style={{ animationDelay: '0.97s' }}>r</span>
                    <span className="dream-letter" style={{ animationDelay: '1.09s' }}>e</span>
                    <span className="dream-letter" style={{ animationDelay: '1.21s' }}>a</span>
                    <span className="dream-letter" style={{ animationDelay: '1.33s' }}>m</span>
                  </span>
                </span>
                {/* Mobile: stack "University" / "Offers" on two lines so the
                    headline doesn't sprawl into the orbit area. Desktop:
                    keep them on one line for visual balance with UniversityOrbit. */}
                <span className="block md:hidden hero-anim-init hero-anim-line" style={{ animationDelay: '1.20s' }}>University</span>
                <span className="block md:hidden hero-anim-init hero-anim-line" style={{ animationDelay: '1.30s' }}>Offers</span>
                <span className="hidden md:block hero-anim-init hero-anim-line" style={{ animationDelay: '1.20s' }}>University Offers</span>
              </h1>
              <div className="max-w-[700px] space-y-1 mt-2 text-left hero-anim-init hero-anim-line" style={{ animationDelay: '1.55s' }}>
                <p className="text-xl md:text-2xl text-muted-foreground font-normal leading-relaxed">
                  Mentors that help you with
                </p>
                <span className="block text-[1.75rem] md:text-4xl font-semibold text-foreground" style={{ lineHeight: 1.25 }}>
                  <FlipWords words={flipWords} duration={1500} />
                </span>
              </div>
              <div className="mt-10 flex justify-start hero-anim-init hero-anim-line" style={{ animationDelay: '1.85s' }}>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="w-full max-w-xs md:w-auto h-12 md:h-14 px-8 md:px-10 text-base md:text-lg font-semibold shadow-md bg-[#128ca0] hover:bg-[#126d94] transition-all hover:shadow-lg hover:translate-y-[-2px] group"
                  >
                    Get started <ArrowRight className="h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
              </div>

            </div>
            <div className="hidden md:flex flex-[3] relative items-center justify-center overflow-hidden" style={{ margin: "-2rem 0" }}>
              <UniversityOrbit />
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials Banner ───────────────────────────────────────── */}
      <TestimonialsBanner />

      {/* ── Summer Studio Banner ──────────────────────────────────────── */}
      <SummerStudioBanner />

      {/* How We Work - Apple-style scroll animation */}
      <section className="w-full bg-white border-t border-[#c2d8d2]/30">
        <ScrollStep
          title="How Can We Help?"
          description="Tell us which universities you're applying to as well as what you need help with. Which part of the application do you need help with? We'll set everything up from there."
          reverse={false}
          videoSrc="/uni_selector_visual.html"
        />
        <ScrollStep
          title="Get Matched with Tutors"
          description="We match you with tutors who fit your exact profile - the right university, the right course, the right experience. No guesswork, just the perfect fit."
          reverse={true}
          mediaContent={<RevolvingCards />}
        />
        <ScrollStep
          title="Build Your Team of Tutors"
          description="Assemble your team of tutors and reach out to them anytime, 24/7. They're here whenever you need them."
          reverse={false}
          wideMedia
          mediaContent={<ChatGraphic />}
        />

        <div className="py-16 flex flex-col items-center gap-4">
          <Link href="/signup">
            <button className="group relative inline-flex items-center justify-center gap-4 px-8 py-4 md:px-12 md:py-6 rounded-2xl bg-[#128ca0] text-white text-lg md:text-2xl font-bold shadow-2xl hover:shadow-[0_20px_60px_-10px_rgba(18,140,160,0.5)] transition-all duration-200 hover:scale-[1.03] hover:bg-[#0f7a8d] active:scale-[0.98] w-full max-w-sm mx-auto md:w-auto">
              Start Your Journey
              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-200" />
            </button>
          </Link>
          <p className="text-muted-foreground text-sm tracking-wide">Free to sign up. No credit card required.</p>
        </div>
      </section>
    </div>
  );
}
