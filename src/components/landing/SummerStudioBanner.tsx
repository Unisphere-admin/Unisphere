"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Summer Studio banner on the landing page.
 *
 * Visual style deliberately matches the `/summer-studio` hero: a warm
 * cream base with golden/amber mesh gradients and floating orange
 * triangle shapes. This gives the click-through page a "you've seen
 * this palette before" moment, rather than a jarring palette switch.
 */
export function SummerStudioBanner() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: "#fffdf0" }}
    >
      {/* -----------------------------------------------------------------
          Warm radial mesh. Same hsla palette as the /summer-studio hero
          so the two sections feel like siblings. Colors are amber/peach/
          gold at varied opacities to keep the paper-like cream feel.
      ----------------------------------------------------------------- */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.75,
          backgroundImage: [
            "radial-gradient(circle at 85% 80%, hsla(30,100%,85%,1) 9%, transparent 55%)",
            "radial-gradient(circle at 60% 24%, hsla(45,100%,80%,1) 5%, transparent 72%)",
            "radial-gradient(circle at 13% 82%, hsla(20,100%,88%,0.6) 5%, transparent 52%)",
            "radial-gradient(circle at 24% 7%, hsla(38,95%,75%,1) 13%, transparent 68%)",
          ].join(","),
          backgroundBlendMode: "normal,normal,normal,normal",
        }}
      />

      {/* -----------------------------------------------------------------
          Floating orange/amber triangle and polygon shapes, mirroring the
          /summer-studio hero. viewBox 1440x560, preserveAspectRatio "none"
          so the shapes spread edge-to-edge on any screen. Each one drifts
          gently via the existing ss-banner-float keyframes.
      ----------------------------------------------------------------- */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 560"
        style={{ zIndex: 1 }}
      >
        <path
          d="M329.5 403.5 L348.1 316 L242 384.9 Z"
          fill="rgba(255, 180, 100, 0.35)"
          style={{ animation: "ss-banner-float2 9s ease-in-out infinite" }}
        />
        <path
          d="M1272 443.4 L1180.6 469.6 L1206.8 561.1 L1298.3 534.9 Z"
          fill="rgba(255, 200, 80, 0.30)"
          style={{ animation: "ss-banner-float3 11s ease-in-out infinite" }}
        />
        <path
          d="M650.4 401.8 C 681.4 401.4, 708.5 382.2, 723.6 355.1 C 738.4 328.7, 738.6 296.9, 723.9 270.5 C 708.7 243.3, 681.4 225.9, 650.4 223.9 C 615.3 221.7, 576.2 229.4, 558.7 259.9 C 541.1 290.3, 554.6 327.6, 573.7 357.2 C 590.9 383.8, 618.7 402.2, 650.4 401.8 Z"
          fill="rgba(255, 160, 80, 0.22)"
          style={{ animation: "ss-banner-float1 13s ease-in-out infinite" }}
        />
        <path
          d="M1248.8 239.9 L1135.7 122.8 L1018.7 235.9 L1131.7 352.97 Z"
          fill="rgba(255, 210, 120, 0.28)"
          style={{ animation: "ss-banner-float1 10s ease-in-out infinite reverse" }}
        />
        <path
          d="M708.8 314.4 L660.6 422.7 L768.9 470.9 L817.1 362.6 Z"
          fill="rgba(255, 185, 60, 0.22)"
          style={{ animation: "ss-banner-float2 12s ease-in-out infinite" }}
        />
        <path
          d="M1122.6 321.8 L1195.4 425.8 L1299.4 352.97 L1226.6 248.98 Z"
          fill="rgba(255, 150, 50, 0.32)"
          style={{ animation: "ss-banner-float3 8s ease-in-out infinite" }}
        />
        {/* Smaller accent shapes for mobile, where the big ones sit outside the frame */}
        <path
          d="M90 120 L60 190 L150 200 Z"
          fill="rgba(255, 170, 70, 0.28)"
          style={{ animation: "ss-banner-float2 7s ease-in-out infinite reverse" }}
        />
        <path
          d="M140 470 L200 430 L240 510 Z"
          fill="rgba(255, 200, 90, 0.30)"
          style={{ animation: "ss-banner-float1 9s ease-in-out infinite" }}
        />
      </svg>

      {/* -----------------------------------------------------------------
          Content
      ----------------------------------------------------------------- */}
      <div className="relative z-10 flex flex-col items-center text-center px-5 md:px-6 py-16 md:py-24 max-w-3xl mx-auto gap-6">
        {/* Pill badge — warm palette now */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,150,50,0.25)",
            color: "#b45309",
          }}
        >
          <span
            className="w-2 h-2 rounded-full bg-emerald-500"
            style={{ animation: "ss-banner-pulse 2s ease-in-out infinite" }}
          />
          Now Enrolling. Limited Spots Available
        </div>

        {/* Heading */}
        <div>
          <p className="text-[0.7rem] sm:text-xs font-semibold uppercase tracking-[0.25em] text-amber-700/70 mb-3">
            Unisphere Presents
          </p>
          <h2
            className="font-bold text-[2.75rem] sm:text-5xl md:text-7xl leading-none tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, #b45309 0%, #d97706 25%, #f59e0b 55%, #ea580c 100%)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "ss-banner-gradient 6s ease infinite",
            }}
          >
            Summer Studio
          </h2>
        </div>

        {/* Tagline */}
        <p className="text-base md:text-lg text-gray-600 max-w-xl leading-relaxed tracking-wide">
          An intensive programme that gives students the edge for top university applications: essays, interviews, activities, and everything in between.
        </p>

        {/* CTA — same warm orange button as before */}
        <Link href="/summer-studio">
          <button
            className="group mt-2 inline-flex items-center justify-center gap-3 px-7 md:px-8 py-3.5 md:py-4 rounded-2xl font-bold text-base md:text-lg text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full max-w-xs sm:w-auto"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
              boxShadow: "0 8px 32px rgba(249,115,22,0.4)",
            }}
          >
            Explore Summer Studio
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </Link>
      </div>
    </section>
  );
}
