"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle,
  Rocket,
  Users,
  Lightbulb,
  Trophy,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ═══════════════════════════════════════════════════════════════════
   STRIPE-INSPIRED ANIMATED GRADIENT BACKGROUND
   A canvas that renders slowly morphing blobs of color, creating
   that signature Stripe aurora / mesh gradient effect.
   ═══════════════════════════════════════════════════════════════════ */

function MeshGradientCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);
  const isVisible = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pause animation when off-screen to save CPU/GPU
    const observer = new IntersectionObserver(
      ([entry]) => { isVisible.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(canvas);

    const dpr = Math.min(devicePixelRatio, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    // Gradient blob definitions - Stripe-style colors
    const blobs = [
      { x: 0.15, y: 0.2, r: 0.45, color: [120, 87, 255], speed: 0.0003, phase: 0 },       // vivid purple
      { x: 0.85, y: 0.15, r: 0.5, color: [0, 163, 255], speed: 0.00025, phase: 1.2 },      // electric blue
      { x: 0.5, y: 0.8, r: 0.5, color: [255, 92, 168], speed: 0.00035, phase: 2.4 },       // hot pink
      { x: 0.2, y: 0.7, r: 0.4, color: [0, 210, 200], speed: 0.0004, phase: 3.6 },         // cyan/teal
      { x: 0.75, y: 0.6, r: 0.35, color: [255, 165, 50], speed: 0.0003, phase: 4.8 },      // warm orange
      { x: 0.4, y: 0.3, r: 0.3, color: [130, 60, 255], speed: 0.00028, phase: 0.8 },       // deep violet
    ];

    let t = 0;
    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      if (!isVisible.current) return; // skip rendering when off-screen

      t++;
      const w = canvas.width;
      const h = canvas.height;

      // Light base
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      for (const blob of blobs) {
        const cx = (blob.x + Math.sin(t * blob.speed + blob.phase) * 0.12) * w;
        const cy = (blob.y + Math.cos(t * blob.speed * 0.8 + blob.phase) * 0.1) * h;
        const radius = blob.r * Math.min(w, h);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const [r, g, b] = blob.color;
        grad.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
        grad.addColorStop(0.4, `rgba(${r},${g},${b},0.1)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Reset composite
      ctx.globalCompositeOperation = "source-over";
    };
    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}

/* ───────────────────── Particle System (rainbow) ─────────────────── */

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<
    { x: number; y: number; vx: number; vy: number; r: number; o: number; hue: number }[]
  >([]);
  const raf = useRef<number>(0);
  const isVisible = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pause animation when off-screen to save CPU/GPU
    const observer = new IntersectionObserver(
      ([entry]) => { isVisible.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(canvas);

    const dpr = Math.min(devicePixelRatio, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 45;
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
      o: Math.random() * 0.4 + 0.1,
      hue: Math.random() * 360,
    }));

    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      if (!isVisible.current) return; // skip rendering when off-screen

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.hue = (p.hue + 0.1) % 360;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.o})`;
        ctx.fill();
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}

/* ───────────────────── Letter-Split Animation ────────────────────── */

function LetterSplit({
  text,
  className = "",
  delay = 0,
  gradient = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  gradient?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const words = text.split(" ");
  let charIndex = 0;

  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((char) => {
            const idx = charIndex++;
            const gradientStyle = gradient
              ? {
                  background: "linear-gradient(135deg, #7857ff, #00a3ff, #ff5ca8, #00d2c8)",
                  backgroundSize: "300% 300%",
                  WebkitBackgroundClip: "text" as const,
                  WebkitTextFillColor: "transparent" as const,
                  backgroundClip: "text" as const,
                  animation: "ss-text-gradient 6s ease infinite",
                }
              : {};
            return (
              <span
                key={`${wi}-${idx}`}
                className="inline-block transition-all duration-500"
                style={{
                  transitionDelay: `${idx * 40}ms`,
                  opacity: visible ? 1 : 0,
                  transform: visible
                    ? "translateY(0) rotateX(0)"
                    : "translateY(24px) rotateX(-40deg)",
                  filter: visible ? "blur(0px)" : "blur(4px)",
                  ...(gradient ? { lineHeight: "1.4", paddingBottom: "0.15em" } : {}),
                  ...gradientStyle,
                }}
              >
                {char}
              </span>
            );
          })}
          {wi < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

/* ────────────────── Scroll Reveal Hook ───────────────────────────── */

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/* ────────────────── Animated Counter ─────────────────────────────── */

function AnimatedCounter({
  target,
  suffix = "",
  duration = 1500,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal(0.5);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, target, duration]);

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>}>
      {count}
      {suffix}
    </span>
  );
}

/* ────────────────── Film Grain ────────────────────────────────────── */

function FilmGrain() {
  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 100, opacity: 0.04 }}>
      <svg width="100%" height="100%">
        <filter id="ss-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ss-grain)" />
      </svg>
    </div>
  );
}

/* ────────────────── Animated Timeline Line ───────────────────────── */

function TimelineProgress() {
  const lineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const line = lineRef.current;
    if (!container || !line) return;

    const onScroll = () => {
      const rect = container.getBoundingClientRect();
      const windowH = window.innerHeight;
      const scrolled = Math.max(0, windowH - rect.top);
      const total = rect.height + windowH;
      const progress = Math.min(1, Math.max(0, scrolled / total));
      line.style.height = `${progress * 100}%`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { lineRef, containerRef };
}

/* ────────────────── Glass Card (dark) ────────────────────────────── */

function GlassCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border transition-all duration-700 cursor-default"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderColor: isVisible
          ? "rgba(120,87,255,0.15)"
          : "rgba(200,200,220,0.3)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? "translateY(0) scale(1)"
          : "translateY(40px) scale(0.95)",
        transitionDelay: `${index * 120}ms`,
        filter: isVisible ? "blur(0px)" : "blur(6px)",
      }}
    >
      {/* Hover gradient glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(120,87,255,0.12) 0%, rgba(0,163,255,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="relative p-7">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110"
          style={{
            background: "linear-gradient(135deg, rgba(120,87,255,0.15), rgba(0,163,255,0.15))",
            boxShadow: "0 0 0 1px rgba(120,87,255,0.1)",
          }}
        >
          <Icon className="h-6 w-6 text-purple-500 transition-transform duration-500 group-hover:rotate-6" />
        </div>
        <h3 className="font-semibold text-lg mb-2 text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>

      {/* Bottom rainbow accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-700"
        style={{
          background: "linear-gradient(90deg, #7857ff, #00a3ff, #ff5ca8, #00d2c8)",
          width: isVisible ? "100%" : "0%",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════ MAIN PAGE ════════════════════════════ */

export default function SummerStudioPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const { lineRef, containerRef } = TimelineProgress();
  const statsReveal = useScrollReveal(0.3);
  const formReveal = useScrollReveal(0.15);

  useEffect(() => {
    const timer = setTimeout(() => setHeroReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: "Please fill in your details",
        description: "We need at least your name and email to get in touch.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setSubmitting(false);
    toast({
      title: "We've got your details!",
      description: "Our team will reach out to you shortly.",
    });
  };

  const features = [
    {
      icon: Lightbulb,
      title: "Brainstorm & Ideation",
      desc: "Work with mentors to find a project idea that aligns with your passions and stands out to admissions teams.",
    },
    {
      icon: Rocket,
      title: "Launch Your Project",
      desc: "Go from concept to execution with structured milestones, accountability, and hands-on guidance every week.",
    },
    {
      icon: Trophy,
      title: "Ivy/Oxbridge Standard",
      desc: "Your project will demonstrate leadership, impact, and initiative at the level top universities expect.",
    },
    {
      icon: Users,
      title: "Peer Community",
      desc: "Collaborate with other driven students. Build connections that last beyond the programme.",
    },
  ];

  const timeline = [
    {
      week: "Week 1",
      title: "Brainstorm & Matchmaking",
      desc: "Figure out what project you want to build. Explore ideas, get inspired by what others have done, and decide whether you want to go solo or team up in groups of three or four. We'll match you with a mentor based on the kind of project you're pursuing.",
    },
    {
      week: "Week 2-3",
      title: "Build with Your Mentor",
      desc: "You're paired with one dedicated mentor and it's time to get building. Define your scope, create a plan, and start executing week by week with your mentor guiding you through it.",
    },
    {
      week: "Week 4-5",
      title: "Launch, Test & Get Fresh Eyes",
      desc: "Your project is taking shape. Now it's time to put it out there and validate your ideas. That might mean publishing on a journal, launching a website, or starting a blog. We'll loop in one or two additional mentors to give you new perspectives and challenge your thinking.",
    },
    {
      week: "Week 6",
      title: "Showcase & Handoff",
      desc: "The final stretch. We'll bring all the students together on a group Zoom to present what everyone has built. Your project is at a place where you can keep going independently, but you'll walk away with something real to show.",
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ss-float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.05); }
          66% { transform: translate(20px, -15px) scale(0.95); }
        }
        @keyframes ss-float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(25px, -20px) scale(1.08); }
          66% { transform: translate(-15px, 25px) scale(0.92); }
        }
        @keyframes ss-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ss-pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(120,87,255,0.3); }
          50% { box-shadow: 0 0 24px 6px rgba(120,87,255,0.15); }
        }
        @keyframes ss-gradient-rotate {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        .ss-gradient-text {
          color: #7857ff;
          background: linear-gradient(135deg, #7857ff, #00a3ff, #ff5ca8, #00d2c8);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ss-text-gradient 6s ease infinite;
        }
        .ss-gradient-text span {
          -webkit-text-fill-color: inherit;
        }
        @keyframes ss-text-gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float1 {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-10px, 0); }
          100% { transform: translate(0, 0); }
        }
        .triangle-float1 { animation: float1 5s infinite; }
        @keyframes float2 {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-5px, -5px); }
          100% { transform: translate(0, 0); }
        }
        .triangle-float2 { animation: float2 4s infinite; }
        @keyframes float3 {
          0% { transform: translate(0, 0); }
          50% { transform: translate(0, -10px); }
          100% { transform: translate(0, 0); }
        }
        .triangle-float3 { animation: float3 6s infinite; }
        @keyframes ani-animateMesh {
          0% {
            --y-0:80%; --c-0:hsla(30,100%,85%,1); --x-0:85%; --s-start-0:9%; --s-end-0:55%;
            --x-1:60%; --s-start-1:5%; --s-end-1:72%; --c-1:hsla(45,100%,80%,1); --y-1:24%;
            --c-2:hsla(20,100%,88%,0.6); --y-2:82%; --x-2:13%; --s-start-2:5%; --s-end-2:52%;
            --s-start-3:13%; --s-end-3:68%; --x-3:24%; --c-3:hsla(38,95%,75%,1); --y-3:7%;
          }
          25% {
            --y-0:83%; --c-0:hsla(32,100%,86%,1); --x-0:75%; --s-start-0:9%; --s-end-0:55%;
            --x-1:48%; --s-start-1:5%; --s-end-1:72%; --c-1:hsla(42,100%,82%,1); --y-1:28%;
            --c-2:hsla(18,100%,87%,0.6); --y-2:65%; --x-2:35%; --s-start-2:5%; --s-end-2:52%;
            --s-start-3:13%; --s-end-3:68%; --x-3:42%; --c-3:hsla(35,95%,77%,1); --y-3:22%;
          }
          50% {
            --y-0:86%; --c-0:hsla(28,100%,84%,1); --x-0:55%; --s-start-0:9%; --s-end-0:55%;
            --x-1:30%; --s-start-1:5%; --s-end-1:72%; --c-1:hsla(48,100%,78%,1); --y-1:32%;
            --c-2:hsla(22,100%,89%,0.6); --y-2:40%; --x-2:70%; --s-start-2:5%; --s-end-2:52%;
            --s-start-3:13%; --s-end-3:68%; --x-3:65%; --c-3:hsla(40,95%,73%,1); --y-3:55%;
          }
          75% {
            --y-0:82%; --c-0:hsla(34,100%,87%,1); --x-0:68%; --s-start-0:9%; --s-end-0:55%;
            --x-1:52%; --s-start-1:5%; --s-end-1:72%; --c-1:hsla(44,100%,81%,1); --y-1:26%;
            --c-2:hsla(16,100%,86%,0.6); --y-2:70%; --x-2:40%; --s-start-2:5%; --s-end-2:52%;
            --s-start-3:13%; --s-end-3:68%; --x-3:35%; --c-3:hsla(36,95%,76%,1); --y-3:18%;
          }
          100% {
            --y-0:80%; --c-0:hsla(30,100%,85%,1); --x-0:85%; --s-start-0:9%; --s-end-0:55%;
            --x-1:60%; --s-start-1:5%; --s-end-1:72%; --c-1:hsla(45,100%,80%,1); --y-1:24%;
            --c-2:hsla(20,100%,88%,0.6); --y-2:82%; --x-2:13%; --s-start-2:5%; --s-end-2:52%;
            --s-start-3:13%; --s-end-3:68%; --x-3:24%; --c-3:hsla(38,95%,75%,1); --y-3:7%;
          }
        }
      ` }} />

      <FilmGrain />

      <div className="min-h-screen with-navbar overflow-hidden" style={{ background: "#ffffff" }}>

        {/* ═══════════════ HERO ═══════════════ */}
        <section
          ref={heroSectionRef}
          className="relative min-h-[90vh] flex items-center overflow-hidden"
          style={{ background: "#ffffff" }}
        >
          {/* SVG floating shapes background */}
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            viewBox="0 0 1440 560"
            style={{ zIndex: 0 }}
          >
            <rect width="1440" height="560" x="0" y="0" fill="#ffffff" />
            <path d="M329.528985870251 403.5166314211907L348.12963464375434 316.00745914553323 242.01981359459353 384.9159826476874z" fill="rgba(255, 180, 100, 0.3)" className="triangle-float2" />
            <path d="M1272.077177949524 443.37734138291154L1180.5632618441673 469.61853455884125 1206.804455020097 561.1324506641979 1298.3183711254537 534.8912574882683z" fill="rgba(255, 200, 80, 0.25)" className="triangle-float3" />
            <path d="M650.423,401.81C681.436,401.382,708.462,382.168,723.597,355.095C738.353,328.699,738.593,296.859,723.858,270.45C708.727,243.331,681.413,225.932,650.423,223.946C615.287,221.694,576.229,229.357,558.652,259.864C541.092,290.34,554.57,327.626,573.667,357.163C590.891,383.804,618.702,402.248,650.423,401.81" fill="rgba(255, 160, 80, 0.25)" className="triangle-float1" />
            <path d="M1248.776353108093 239.91338387452498L1135.7244326132977 122.84469316992315 1018.655741908696 235.89661366471836 1131.7076624034912 352.9653043693202z" fill="rgba(255, 210, 120, 0.25)" className="triangle-float1" />
            <path d="M708.7915817329138 314.42984279756297L660.5871273372517 422.69882003620876 768.8561045758975 470.90327443187084 817.0605589715595 362.63429719322505z" fill="rgba(255, 185, 60, 0.2)" className="triangle-float2" />
            <path d="M1122.577335511966 321.7901652545471L1195.391665502364 425.77980549259644 1299.3813057404134 352.9654755021985 1226.5669757500154 248.9758352641491z" fill="rgba(255, 150, 50, 0.3)" className="triangle-float3" />
          </svg>

          {/* Animated mesh gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 1,
              opacity: 0.65,
              "--y-0": "80%",
              "--c-0": "hsla(30,100%,85%,1)",
              "--x-0": "85%",
              "--s-start-0": "9%",
              "--s-end-0": "55%",
              "--x-1": "60%",
              "--s-start-1": "5%",
              "--s-end-1": "72%",
              "--c-1": "hsla(45,100%,80%,1)",
              "--y-1": "24%",
              "--c-2": "hsla(20,100%,88%,0.6)",
              "--y-2": "82%",
              "--x-2": "13%",
              "--s-start-2": "5%",
              "--s-end-2": "52%",
              "--s-start-3": "13%",
              "--s-end-3": "68%",
              "--x-3": "24%",
              "--c-3": "hsla(38,95%,75%,1)",
              "--y-3": "7%",
              backgroundColor: "hsla(115,0%,100%,1)",
              backgroundImage: "radial-gradient(circle at var(--x-0) var(--y-0), var(--c-0) var(--s-start-0),transparent var(--s-end-0)),radial-gradient(circle at var(--x-1) var(--y-1), var(--c-1) var(--s-start-1),transparent var(--s-end-1)),radial-gradient(circle at var(--x-2) var(--y-2), var(--c-2) var(--s-start-2),transparent var(--s-end-2)),radial-gradient(circle at var(--x-3) var(--y-3), var(--c-3) var(--s-start-3),transparent var(--s-end-3))",
              backgroundBlendMode: "normal,normal,normal,normal",
              willChange: "transform, opacity",
              contain: "paint",
              animation: "ani-animateMesh 120s ease-in-out infinite",
            } as React.CSSProperties}
          />

          {/* Particle overlay */}
          <ParticleCanvas />

          <div className="container max-w-screen-xl mx-auto px-4 md:px-6 relative" style={{ zIndex: 10 }}>
            <div className="max-w-3xl mx-auto text-center">
              {/* Header */}
              <p
                className="text-sm md:text-base uppercase tracking-[0.25em] font-semibold mb-4 transition-all duration-700"
                style={{
                  color: "#6b46c1",
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "translateY(0)" : "translateY(20px)",
                  filter: heroReady ? "blur(0)" : "blur(4px)",
                }}
              >
                Introducing Unisphere Summer Studio
              </p>

              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium mb-8 transition-all duration-700"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  color: "#6b46c1",
                  border: "1px solid rgba(120,87,255,0.2)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "translateY(0)" : "translateY(20px)",
                  filter: heroReady ? "blur(0)" : "blur(4px)",
                }}
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                New for Summer 2026
              </div>

              {/* Headline with letter-split */}
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.15] text-gray-900">
                <LetterSplit text="Build a Standout" delay={400} className="block" />
                <span className="block">
                  <LetterSplit text="Leadership Project" delay={900} gradient />
                </span>
                <LetterSplit text="in 6 Weeks" delay={1400} className="block" />
              </h1>

              {/* Subtitle */}
              <p
                className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-1000"
                style={{
                  color: "rgba(60,60,80,0.7)",
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "translateY(0)" : "translateY(30px)",
                  filter: heroReady ? "blur(0)" : "blur(4px)",
                  transitionDelay: "1800ms",
                }}
              >
                An intensive 6-week programme to brainstorm, design, and launch
                a leadership project built to Ivy League and Oxbridge standards.
                Walk away with something real that admissions teams will notice.
              </p>

              {/* CTA */}
              <div
                className="transition-all duration-700"
                style={{
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
                  transitionDelay: "2100ms",
                }}
              >
                <a href="#get-started">
                  <button
                    className="relative px-10 py-4 rounded-xl text-white font-medium text-base overflow-hidden group transition-all duration-300 hover:translate-y-[-3px] hover:shadow-2xl w-full max-w-xs sm:w-auto"
                    style={{
                      background: "linear-gradient(135deg, #7857ff, #00a3ff)",
                      boxShadow: "0 4px 24px rgba(120,87,255,0.3)",
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Enroll Now
                      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                        backgroundSize: "200% 100%",
                        animation: "ss-shimmer 1.5s infinite",
                      }}
                    />
                  </button>
                </a>
              </div>
            </div>
          </div>

          {/* Hero cutout photos - vw-based sizing stays consistent across zoom levels */}
          <div className="absolute bottom-0 pointer-events-none hidden md:block" style={{ zIndex: 4, left: "calc(50% - clamp(275px, 35vw, 530px) - 10vw)", width: "clamp(275px, 35vw, 530px)" }}>
            <img
              src="/hero-left.webp"
              alt="Presenter"
              className="w-full h-auto"
              loading="eager"
              style={{ display: "block" }}
            />
          </div>
          <div className="absolute bottom-0 pointer-events-none hidden md:block" style={{ zIndex: 4, right: "calc(50% - clamp(275px, 35vw, 530px) - 8vw)", width: "clamp(275px, 35vw, 530px)" }}>
            <img
              src="/hero-right.webp"
              alt="Presenter"
              className="w-full h-auto"
              loading="eager"
              style={{ display: "block" }}
            />
          </div>

          {/* Hard divider line at bottom of hero */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{ zIndex: 5 }}
          >
            <div className="w-full h-px bg-gray-200" />
          </div>
        </section>

        {/* ═══════════════ WHAT YOU GET ═══════════════ */}
        <section className="py-20 relative">
          <div className="container max-w-screen-xl mx-auto px-4 md:px-6">
            <SectionHeading
              overline="Programme Highlights"
              title="What You Get"
              subtitle="Everything you need to go from zero to a polished leadership project in one summer"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
              {features.map((item, i) => (
                <GlassCard key={item.title} index={i} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ TIMELINE ═══════════════ */}
        <section className="py-20 relative overflow-hidden">
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(120,87,255,0.4) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="container max-w-screen-xl mx-auto px-4 md:px-6 relative z-10">
            <SectionHeading
              overline="Your Journey"
              title="How It Works"
              subtitle="A structured 6-week path from idea to impact"
            />

            <div ref={containerRef} className="max-w-2xl mx-auto relative">
              {/* Animated progress line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-gray-200 rounded-full overflow-hidden">
                <div
                  ref={lineRef}
                  className="w-full rounded-full"
                  style={{
                    background: "linear-gradient(to bottom, #7857ff, #00a3ff, #ff5ca8)",
                    height: "0%",
                    transition: "height 0.1s linear",
                  }}
                />
              </div>

              <div className="space-y-10">
                {timeline.map((step, i) => (
                  <TimelineStep key={step.week} step={step} index={i} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ CONTACT FORM ═══════════════ */}
        <section id="get-started" className="py-20 relative overflow-hidden" style={{ background: "#ffffff" }}>

          {/* SVG floating shapes - same as hero */}
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            viewBox="0 0 1440 560"
            style={{ zIndex: 0 }}
          >
            <rect width="1440" height="560" x="0" y="0" fill="#ffffff" />
            <path d="M329.528985870251 403.5166314211907L348.12963464375434 316.00745914553323 242.01981359459353 384.9159826476874z" fill="rgba(255, 180, 100, 0.3)" className="triangle-float2" />
            <path d="M1272.077177949524 443.37734138291154L1180.5632618441673 469.61853455884125 1206.804455020097 561.1324506641979 1298.3183711254537 534.8912574882683z" fill="rgba(255, 200, 80, 0.25)" className="triangle-float3" />
            <path d="M650.423,401.81C681.436,401.382,708.462,382.168,723.597,355.095C738.353,328.699,738.593,296.859,723.858,270.45C708.727,243.331,681.413,225.932,650.423,223.946C615.287,221.694,576.229,229.357,558.652,259.864C541.092,290.34,554.57,327.626,573.667,357.163C590.891,383.804,618.702,402.248,650.423,401.81" fill="rgba(255, 160, 80, 0.25)" className="triangle-float1" />
            <path d="M1248.776353108093 239.91338387452498L1135.7244326132977 122.84469316992315 1018.655741908696 235.89661366471836 1131.7076624034912 352.9653043693202z" fill="rgba(255, 210, 120, 0.25)" className="triangle-float1" />
            <path d="M708.7915817329138 314.42984279756297L660.5871273372517 422.69882003620876 768.8561045758975 470.90327443187084 817.0605589715595 362.63429719322505z" fill="rgba(255, 185, 60, 0.2)" className="triangle-float2" />
            <path d="M1122.577335511966 321.7901652545471L1195.391665502364 425.77980549259644 1299.3813057404134 352.9654755021985 1226.5669757500154 248.9758352641491z" fill="rgba(255, 150, 50, 0.3)" className="triangle-float3" />
          </svg>

          {/* Animated warm yellow mesh gradient overlay - same as hero */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 1,
              opacity: 0.65,
              "--y-0": "80%", "--c-0": "hsla(30,100%,85%,1)", "--x-0": "85%", "--s-start-0": "9%", "--s-end-0": "55%",
              "--x-1": "60%", "--s-start-1": "5%", "--s-end-1": "72%", "--c-1": "hsla(45,100%,80%,1)", "--y-1": "24%",
              "--c-2": "hsla(20,100%,88%,0.6)", "--y-2": "82%", "--x-2": "13%", "--s-start-2": "5%", "--s-end-2": "52%",
              "--s-start-3": "13%", "--s-end-3": "68%", "--x-3": "24%", "--c-3": "hsla(38,95%,75%,1)", "--y-3": "7%",
              backgroundColor: "hsla(115,0%,100%,1)",
              backgroundImage: "radial-gradient(circle at var(--x-0) var(--y-0), var(--c-0) var(--s-start-0),transparent var(--s-end-0)),radial-gradient(circle at var(--x-1) var(--y-1), var(--c-1) var(--s-start-1),transparent var(--s-end-1)),radial-gradient(circle at var(--x-2) var(--y-2), var(--c-2) var(--s-start-2),transparent var(--s-end-2)),radial-gradient(circle at var(--x-3) var(--y-3), var(--c-3) var(--s-start-3),transparent var(--s-end-3))",
              animation: "ani-animateMesh 120s ease-in-out infinite",
            } as React.CSSProperties}
          />

          <div className="container max-w-screen-xl mx-auto px-4 md:px-6 relative z-10">
            <div
              ref={formReveal.ref}
              className="max-w-lg mx-auto transition-all duration-1000"
              style={{
                opacity: formReveal.isVisible ? 1 : 0,
                transform: formReveal.isVisible ? "translateY(0)" : "translateY(40px)",
              }}
            >
              <SectionHeading
                overline="Ready to start?"
                title="Enroll Now"
                subtitle="Leave your details and our team will reach out to you on WhatsApp to get you set up."
              />

              {submitted ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(120,87,255,0.1)",
                    boxShadow: "0 8px 32px rgba(120,87,255,0.08)",
                  }}
                >
                  <div
                    className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(120,87,255,0.1)",
                      animation: "ss-pulse-glow 2s ease-in-out infinite",
                    }}
                  >
                    <CheckCircle className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    You&apos;re on the list!
                  </h3>
                  <p className="text-gray-500 text-sm">
                    We&apos;ll message you on WhatsApp shortly to tell you more
                    about Summer Studio and get you started.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl p-7 md:p-9 space-y-5"
                  style={{
                    background: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(120,87,255,0.1)",
                    boxShadow: "0 8px 32px rgba(120,87,255,0.08)",
                  }}
                >
                  {[
                    {
                      label: "Full Name",
                      required: true,
                      type: "text",
                      key: "name" as const,
                      placeholder: "e.g. Sarah Chen",
                    },
                    {
                      label: "Email",
                      required: true,
                      type: "email",
                      key: "email" as const,
                      placeholder: "sarah@example.com",
                    },
                    {
                      label: "WhatsApp Number",
                      required: false,
                      type: "tel",
                      key: "phone" as const,
                      placeholder: "+60 12 345 6789",
                      hint: "So we can message you directly",
                    },
                    {
                      label: "What school are you currently in?",
                      required: false,
                      type: "text",
                      key: "school" as const,
                      placeholder: "e.g. Gardens International School, Malaysia",
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {field.label}{" "}
                        {field.required && (
                          <span className="text-pink-400">*</span>
                        )}
                      </label>
                      <input
                        type={field.type}
                        value={formData[field.key]}
                        onChange={(e) =>
                          setFormData({ ...formData, [field.key]: e.target.value })
                        }
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 text-sm rounded-xl text-gray-900 placeholder-gray-300 transition-all duration-300 focus:outline-none"
                        style={{
                          background: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(120,87,255,0.15)",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "rgba(120,87,255,0.5)";
                          e.target.style.boxShadow = "0 0 0 3px rgba(120,87,255,0.1)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "rgba(120,87,255,0.15)";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      {field.hint && (
                        <p className="text-xs text-gray-400 mt-1">{field.hint}</p>
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Anything else you'd like us to know?"
                      rows={3}
                      className="w-full px-4 py-3 text-sm rounded-xl text-gray-900 placeholder-gray-300 transition-all duration-300 resize-none focus:outline-none"
                      style={{
                        background: "rgba(255,255,255,0.9)",
                        border: "1px solid rgba(120,87,255,0.15)",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(120,87,255,0.5)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(120,87,255,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(120,87,255,0.15)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-xl text-white font-medium text-base relative overflow-hidden group transition-all duration-300 hover:shadow-2xl disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #7857ff, #00a3ff)",
                      boxShadow: "0 4px 24px rgba(120,87,255,0.25)",
                    }}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Say Hello
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                        backgroundSize: "200% 100%",
                        animation: "ss-shimmer 1.5s infinite",
                      }}
                    />
                  </button>

                  <p className="text-xs text-center text-gray-400">
                    We&apos;ll reach out on WhatsApp within 24 hours
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ────────────────── Section Heading (dark) ───────────────────────── */

function SectionHeading({
  overline,
  title,
  subtitle,
}: {
  overline: string;
  title: string;
  subtitle: string;
}) {
  const { ref, isVisible } = useScrollReveal(0.3);

  return (
    <div
      ref={ref}
      className="text-center mb-14"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(25px)",
        filter: isVisible ? "blur(0)" : "blur(4px)",
        transitionDuration: "800ms",
        transitionProperty: "all",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] ss-gradient-text mb-3 inline-block">
        {overline}
      </p>
      <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
        {title}
      </h2>
      <p className="text-gray-500 max-w-xl mx-auto">{subtitle}</p>
    </div>
  );
}

/* ────────────────── Timeline Step (dark) ─────────────────────────── */

function TimelineStep({
  step,
  index,
}: {
  step: { week: string; title: string; desc: string };
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.3);

  return (
    <div
      ref={ref}
      className="flex gap-5 transition-all duration-700"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(-30px)",
        filter: isVisible ? "blur(0)" : "blur(6px)",
        transitionDelay: `${index * 150}ms`,
      }}
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white relative transition-all duration-500"
          style={{
            background: isVisible
              ? "linear-gradient(135deg, #7857ff, #00a3ff)"
              : "#e5e7eb",
            boxShadow: isVisible
              ? "0 0 20px rgba(120,87,255,0.35), 0 4px 12px rgba(0,163,255,0.2)"
              : "none",
          }}
        >
          {index + 1}
          {isVisible && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                border: "2px solid rgba(120,87,255,0.3)",
                animationDuration: "2s",
                animationIterationCount: "1",
              }}
            />
          )}
        </div>
      </div>
      <div className="pb-8 pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-1.5 ss-gradient-text inline-block">
          {step.week}
        </p>
        <h3 className="font-semibold text-lg mb-1.5 text-gray-900">
          {step.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
      </div>
    </div>
  );
}
