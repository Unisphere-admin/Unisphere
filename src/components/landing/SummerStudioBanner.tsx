"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function SummerStudioBanner() {
  return (
    <section className="relative w-full overflow-hidden" style={{ background: "#fffdf0" }}>

      {/* Colorful mesh blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Vivid purple - top left */}
        <div className="absolute w-[520px] h-[520px] rounded-full"
          style={{ top: "-10%", left: "-8%", background: "radial-gradient(circle, rgba(120,87,255,0.28) 0%, transparent 70%)", animation: "ss-banner-float1 9s ease-in-out infinite" }} />
        {/* Electric blue - top right */}
        <div className="absolute w-[480px] h-[480px] rounded-full"
          style={{ top: "-15%", right: "-8%", background: "radial-gradient(circle, rgba(0,163,255,0.22) 0%, transparent 70%)", animation: "ss-banner-float2 11s ease-in-out infinite" }} />
        {/* Hot pink - bottom left */}
        <div className="absolute w-[420px] h-[420px] rounded-full"
          style={{ bottom: "-15%", left: "15%", background: "radial-gradient(circle, rgba(255,92,168,0.2) 0%, transparent 70%)", animation: "ss-banner-float3 10s ease-in-out infinite" }} />
        {/* Cyan/teal - bottom right */}
        <div className="absolute w-[380px] h-[380px] rounded-full"
          style={{ bottom: "-10%", right: "10%", background: "radial-gradient(circle, rgba(0,210,200,0.22) 0%, transparent 70%)", animation: "ss-banner-float1 13s ease-in-out infinite reverse" }} />
        {/* Warm orange - centre */}
        <div className="absolute w-[320px] h-[320px] rounded-full"
          style={{ top: "30%", left: "42%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(255,165,50,0.15) 0%, transparent 70%)", animation: "ss-banner-float2 8s ease-in-out infinite reverse" }} />
      </div>

      {/* Floating SVG triangle shapes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1440 420" style={{ zIndex: 0 }}>
        <path d="M180 320 L210 230 L120 290z" fill="rgba(255,180,100,0.28)" style={{ animation: "ss-banner-float2 5s infinite" }} />
        <path d="M1280 360 L1210 390 L1230 460 L1300 430z" fill="rgba(255,200,80,0.22)" style={{ animation: "ss-banner-float3 6s infinite" }} />
        <path d="M1100 80 L1030 30 L980 110 L1050 160z" fill="rgba(255,210,120,0.2)" style={{ animation: "ss-banner-float1 7s infinite" }} />
        <path d="M340 60 L290 120 L380 140z" fill="rgba(255,150,50,0.25)" style={{ animation: "ss-banner-float3 4s infinite" }} />
      </svg>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 py-16 md:py-24 max-w-3xl mx-auto gap-6">

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
          style={{ background: "rgba(120,87,255,0.08)", border: "1px solid rgba(120,87,255,0.2)", color: "#7857ff" }}>
          <span className="w-2 h-2 rounded-full bg-emerald-500"
            style={{ animation: "ss-banner-pulse 2s ease-in-out infinite" }} />
          Now Enrolling. Limited Spots Available
        </div>

        {/* Heading */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400 mb-3">
            Unisphere Presents
          </p>
          <h2 className="font-bold text-4xl sm:text-5xl md:text-7xl leading-none tracking-tight"
            style={{
              background: "linear-gradient(135deg, #7857ff, #00a3ff, #ff5ca8, #00d2c8)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "ss-banner-gradient 6s ease infinite",
            }}>
            Summer Studio
          </h2>
        </div>

        {/* Tagline */}
        <p className="text-base md:text-lg text-gray-500 max-w-xl leading-relaxed tracking-wide">
          An intensive programme that gives students the edge for top university applications: essays, interviews, activities, and everything in between.
        </p>

        {/* CTA */}
        <Link href="/summer-studio">
          <button className="group mt-2 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-base md:text-lg text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full max-w-xs sm:w-auto"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
              boxShadow: "0 8px 32px rgba(249,115,22,0.4)",
            }}>
            <Sparkles className="h-5 w-5" />
            Explore Summer Studio
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </Link>
      </div>
    </section>
  );
}
