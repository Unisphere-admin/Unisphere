"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Same teal-variant gradient stack used by /testimonials, applied scoped to
// just this section. We don't reuse <InteractiveGridBackground/> directly
// because it positions itself `fixed inset-0` to cover the whole viewport —
// fine for full-page use, but it would bleed into the hero when embedded.
const TEAL_BG = [
  "linear-gradient(123deg, transparent 0%, transparent 34%, rgba(35,95,210,0.16) 34%, rgba(35,95,210,0.16) 54%, transparent 54%, transparent 100%)",
  "linear-gradient(251deg, transparent 0%, transparent 62%, rgba(45,175,235,0.16) 62%, rgba(45,175,235,0.16) 84%, transparent 84%, transparent 100%)",
  "linear-gradient(140deg, rgba(18,140,175,0.28) 0%, transparent 44%)",
  "linear-gradient(220deg, rgba(45,135,225,0.26) 0%, transparent 44%)",
  "linear-gradient(310deg, rgba(70,195,235,0.22) 0%, transparent 42%)",
  "linear-gradient(180deg, transparent 20%, rgba(255,255,255,0.32) 50%, transparent 80%)",
  "linear-gradient(150deg, #d4ecf5 0%, #b8dcee 35%, #eef6f9 65%, #c0dcec 100%)",
].join(",");

// Universities our students have got into. Listed in the order they should
// appear in the marquee. `src: null` means we do not yet have that logo file
// in /public/Unilogos/ — those render as a clean text fallback so the layout
// stays correct, and you can drop in the PNG later with no other changes.
type LogoItem = { name: string; src: string | null; short?: string };

const LOGOS: ReadonlyArray<LogoItem> = [
  { name: "Oxford",           src: "/Unilogos/Oxford Logo.png" },
  { name: "LSE",              src: "/Unilogos/LSE Logo.png" },
  { name: "Imperial",         src: "/Unilogos/Imperial Logo.png" },
  { name: "Princeton",        src: "/Unilogos/Princeton Logo.png" },
  { name: "Yale",             src: "/Unilogos/Yale Logo.png" },
  { name: "Columbia",         src: "/Unilogos/Columbia Logo.png" },
  { name: "Brown",            src: "/Unilogos/Brown Logo.png" },
  { name: "Dartmouth",        src: null, short: "Dart." },       // TODO: add /public/Unilogos/Dartmouth Logo.png
  { name: "Carnegie Mellon",  src: null, short: "CMU"  },        // TODO: add /public/Unilogos/CarnegieMellon Logo.png
  { name: "Cornell",          src: "/Unilogos/Cornell Logo.png" },
  { name: "UCL",              src: "/Unilogos/UCL Logo.png" },
];

export const TestimonialsBanner = memo(function TestimonialsBanner() {
  // Duplicate the list so the marquee loops seamlessly. The animation
  // translates the track by exactly -50%, which lines the second copy up
  // with the start position and produces an unbroken loop.
  const items = [...LOGOS, ...LOGOS];

  return (
    // Same teal gradient stack as /testimonials, but scoped to this section
    // via `absolute inset-0` instead of the component's `fixed` default.
    <section className="relative py-10 md:py-14 border-t border-b border-[#c2d8d2]/30 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: TEAL_BG }}
      />

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-screen-xl mb-7 md:mb-9 text-center">
        <p className="text-[0.7rem] md:text-xs font-semibold uppercase tracking-[0.24em] text-[#128ca0]/80 mb-3">
          Student Success Stories
        </p>
        <Link
          href="/testimonials"
          className="group relative inline-flex items-center gap-3 pl-6 pr-5 py-3 md:pl-7 md:pr-6 md:py-3.5 rounded-full font-semibold text-white text-sm md:text-base tracking-wide
                     bg-gradient-to-r from-[#0f7a8d] via-[#128ca0] to-[#17b2c6]
                     shadow-[0_10px_30px_-8px_rgba(18,140,160,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]
                     hover:shadow-[0_18px_40px_-8px_rgba(18,140,160,0.65),inset_0_1px_0_rgba(255,255,255,0.35)]
                     hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
        >
          {/* Subtle highlight stripe that sweeps across on hover */}
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
            <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-18deg] translate-x-[-50%] group-hover:translate-x-[380%] transition-transform duration-700 ease-out" />
          </span>

          <span className="relative">Visit Testimonials Section</span>
          <ArrowRight className="w-4 h-4 md:w-[18px] md:h-[18px] transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
        </Link>
      </div>

      {/* Logo marquee. Edge fades are tinted to match the teal gradient base
          (rather than pure white) so the marquee blends back into the section
          background instead of cutting a white shape out of it. */}
      <div className="relative z-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-28 z-10 bg-gradient-to-r from-[#dbecf3] via-[#dbecf3]/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-28 z-10 bg-gradient-to-l from-[#dbecf3] via-[#dbecf3]/80 to-transparent" />

        <div className="tb-logo-track flex w-max items-center gap-10 md:gap-14 px-6 py-2">
          {items.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex-shrink-0 flex items-center justify-center"
              title={logo.name}
            >
              {logo.src ? (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.08)] bg-white">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              ) : (
                // Fallback tile for logos we do not have the PNG for yet.
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 text-xs md:text-sm font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                  {logo.short ?? logo.name.slice(0, 3)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes tb-logo-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .tb-logo-track {
          animation: tb-logo-marquee 35s linear infinite;
          will-change: transform;
        }
        .tb-logo-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .tb-logo-track { animation: none; }
        }
      `}</style>
    </section>
  );
});
