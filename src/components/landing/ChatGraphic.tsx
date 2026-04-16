"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

const convoA = [
  { from: "josh", name: "Josh", text: "Hi Sarah, need help with extracurriculars?", role: "tutor" as const },
  { from: "sarah", name: "Sarah", text: "Yes please! I'm not sure where to start.", role: "student" as const },
  { from: "josh", name: "Josh", text: "Let's map it out this week. I'll put a plan together for you.", role: "tutor" as const },
  { from: "sarah", name: "Sarah", text: "Sounds perfect, thank you!", role: "student" as const },
];

const convoB = [
  { from: "sarah", name: "Sarah", text: "Hi Harish! Can you help me with my SAT English?", role: "student" as const },
  { from: "harish", name: "Harish", text: "Yes, let's schedule a meeting for tomorrow. I'll create a lesson plan.", role: "tutor" as const },
  { from: "sarah", name: "Sarah", text: "Thank you so much!", role: "student" as const },
  { from: "harish", name: "Harish", text: "I've sent you a lesson request.", role: "tutor" as const },
];

function JoshAvatar() {
  return (
    <div className="w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
      <Image src="/headshots/Josh PFP.png" alt="Josh" width={66} height={66} className="w-full h-full object-cover" />
    </div>
  );
}

function SarahAvatar() {
  return (
    <div className="w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
      <Image src="/headshots/Sarah PFP.png" alt="Sarah" width={66} height={66} className="w-full h-full object-cover" />
    </div>
  );
}

function HarishAvatar() {
  return (
    <div className="w-[60px] h-[60px] md:w-[66px] md:h-[66px] rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
      <Image src="/headshots/Harish PFP.png" alt="Harish" width={66} height={66} className="w-full h-full object-cover" />
    </div>
  );
}

type Message = { from: string; name: string; text: string; role: "tutor" | "student" };

function Avatar({ from }: { from: string }) {
  if (from === "josh") return <JoshAvatar />;
  if (from === "harish") return <HarishAvatar />;
  return <SarahAvatar />;
}

function ChatBubbles({
  messages,
  visibleCount,
  studentColor = "#128ca0",
  studentShadow = "rgba(18, 140, 160, 0.25)",
}: {
  messages: Message[];
  visibleCount: number;
  studentColor?: string;
  studentShadow?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => {
        const isTutor = msg.role === "tutor";
        const isVisible = i < visibleCount;
        const slideX = isTutor ? "-20px" : "20px";
        return (
          <div
            key={i}
            className={`flex items-end gap-2 ${isTutor ? "flex-row" : "flex-row-reverse"}`}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? "translateY(0) translateX(0) scale(1)"
                : `translateY(16px) translateX(${slideX}) scale(0.88)`,
              transition: isVisible
                ? "opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "opacity 0.2s ease, transform 0.2s ease",
            }}
          >
            <Avatar from={msg.from} />
            <div className={`flex flex-col ${isTutor ? "" : "items-end"}`}>
              <span
                className={`text-[16px] font-medium text-gray-500 mb-0.5 ${isTutor ? "ml-1" : "mr-1"}`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transition: "opacity 0.3s ease 0.15s",
                }}
              >
                {msg.name} <span className="text-gray-400 font-normal">({isTutor ? "Tutor" : "Student"})</span>
              </span>
              <div
                className={`max-w-[420px] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                  isTutor
                    ? "bg-gray-100 text-gray-800 rounded-bl-sm"
                    : "text-white rounded-br-sm"
                }`}
                style={{
                  backgroundColor: isTutor ? undefined : studentColor,
                  boxShadow: isVisible
                    ? isTutor
                      ? "0 4px 12px rgba(0, 0, 0, 0.08)"
                      : `0 4px 14px ${studentShadow}`
                    : "none",
                  transition: "box-shadow 0.4s ease",
                }}
              >
                {msg.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/*
  Animation phases:
  1. "playing-first"  - convoA plays centered, messages appear one by one
  2. "sliding-left"   - convoA slides to the left, divider fades in
  3. "playing-second" - convoB plays on the right side
  4. "pausing"        - hold everything visible briefly
  5. "resetting"      - fade out, then loop back to phase 1
*/
type Phase = "playing-first" | "sliding-left" | "playing-second" | "pausing" | "resetting";

const MSG_INTERVAL = 1500;
const SLIDE_DURATION = 1000;
const PAUSE_DURATION = 3000;
const RESET_DURATION = 1800;

export function ChatGraphic() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState<Phase>("playing-first");
  const [countA, setCountA] = useState(0);
  const [countB, setCountB] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Only start animation when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const resetAll = useCallback(() => {
    setPhase("resetting");
    setTimeout(() => {
      setCountA(0);
      setCountB(0);
      setPhase("playing-first");
    }, RESET_DURATION);
  }, []);

  // Phase 1: Play convoA messages one by one (only when in view)
  useEffect(() => {
    if (phase !== "playing-first" || !inView) return;
    const timer = setTimeout(() => {
      const next = countA + 1;
      if (next > convoA.length) {
        // On mobile skip the slide - go straight to second conversation
        setPhase(isMobile ? "playing-second" : "sliding-left");
      } else {
        setCountA(next);
      }
    }, countA === 0 ? 600 : MSG_INTERVAL);
    return () => clearTimeout(timer);
  }, [phase, countA, inView, isMobile]);

  // Phase 2: After slide completes, start playing convoB
  useEffect(() => {
    if (phase !== "sliding-left") return;
    const timer = setTimeout(() => {
      setPhase("playing-second");
    }, SLIDE_DURATION + 300);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 3: Play convoB messages one by one
  useEffect(() => {
    if (phase !== "playing-second") return;
    const timer = setTimeout(() => {
      const next = countB + 1;
      if (next > convoB.length) {
        setPhase("pausing");
      } else {
        setCountB(next);
      }
    }, countB === 0 ? 400 : MSG_INTERVAL);
    return () => clearTimeout(timer);
  }, [phase, countB]);

  // Phase 4: Pause then reset
  useEffect(() => {
    if (phase !== "pausing") return;
    const timer = setTimeout(() => {
      resetAll();
    }, PAUSE_DURATION);
    return () => clearTimeout(timer);
  }, [phase, resetAll]);

  const hasSlidLeft = !isMobile && (phase === "sliding-left" || phase === "playing-second" || phase === "pausing");
  const showDivider = !isMobile && (phase === "playing-second" || phase === "pausing");
  const showSecondChat = phase === "playing-second" || phase === "pausing";
  // On mobile, fade out convoA when convoB takes over
  const hideFirstOnMobile = isMobile && showSecondChat;
  const isFadingOut = phase === "resetting";

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative"
      style={{
        height: "420px",
        opacity: isFadingOut ? 0 : 1,
        transition: `opacity ${RESET_DURATION}ms ease`,
      }}
    >
      {/* First chat - uses transform for smooth GPU-accelerated slide */}
      <div
        className="absolute top-6 will-change-transform"
        style={{
          width: isMobile ? "92%" : "46%",
          left: isMobile ? "50%" : hasSlidLeft ? "1%" : "50%",
          transform: isMobile ? "translateX(-50%)" : hasSlidLeft ? "translateX(0)" : "translateX(-50%)",
          opacity: hideFirstOnMobile ? 0 : 1,
          transition: `left ${SLIDE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${SLIDE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease`,
        }}
      >
        <p className="text-center text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
          Extracurricular Building
        </p>
        <ChatBubbles messages={convoA} visibleCount={countA} />
      </div>

      {/* Divider */}
      <div
        className="absolute top-6 bottom-6"
        style={{
          left: "49.5%",
          width: "1px",
          backgroundColor: "#d1d5db",
          opacity: showDivider ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      />

      {/* Second chat */}
      <div
        className="absolute top-6"
        style={{
          left: isMobile ? "50%" : "52%",
          right: isMobile ? undefined : "1%",
          width: isMobile ? "92%" : undefined,
          transform: isMobile ? "translateX(-50%)" : undefined,
          opacity: showSecondChat ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        <p className="text-center text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
          SAT Tutoring
        </p>
        <ChatBubbles messages={convoB} visibleCount={countB} studentColor="#5bb8d4" studentShadow="rgba(91, 184, 212, 0.25)" />
      </div>
    </div>
  );
}
