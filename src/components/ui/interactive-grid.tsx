"use client";

import { useEffect, useRef } from "react";

const SQUARE_SIZE = 28;
const GAP = 6;
const STEP = SQUARE_SIZE + GAP;

// Seeded pseudo-random - same algorithm as before for visual consistency
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * StaticGrid - draws the sparse Lego-style square grid onto a single <canvas>.
 * Replaces the previous approach of rendering ~1,100 individual <div> DOM nodes,
 * which caused significant layout/paint overhead on the About page.
 */
function StaticGrid({ variant = "default" }: { variant?: "default" | "teal" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = variant === "teal"
        ? "rgba(30, 130, 160, 0.16)"
        : "rgba(100, 80, 200, 0.13)";
      ctx.lineWidth = 1;

      const rand = seededRandom(77);
      const cols = Math.ceil(canvas.width / STEP) + 2;
      const rows = Math.ceil(canvas.height / STEP) + 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const show = rand() > 0.70;
          if (show) {
            const x = col * STEP;
            const y = row * STEP;
            ctx.beginPath();
            ctx.roundRect(x, y, SQUARE_SIZE, SQUARE_SIZE, 5);
            ctx.stroke();
          }
        }
      }
    };

    draw();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 150);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

/**
 * InteractiveGridBackground - fixed behind all page content.
 * Diagonal stripe bands + gradient base + scattered static squares.
 *
 * Two palettes:
 *   - "default": rich blue/purple/pink wash (used by /about)
 *   - "teal":    teal/sky-blue/white wash (used by /testimonials)
 */
export function InteractiveGridBackground({
  variant = "default",
}: {
  variant?: "default" | "teal";
}) {
  const backgroundImage = variant === "teal"
    ? [
        /* Diagonal stripe band 1 - deep royal blue */
        "linear-gradient(123deg, transparent 0%, transparent 34%, rgba(35,95,210,0.16) 34%, rgba(35,95,210,0.16) 54%, transparent 54%, transparent 100%)",
        /* Diagonal stripe band 2 - bright cyan-blue */
        "linear-gradient(251deg, transparent 0%, transparent 62%, rgba(45,175,235,0.16) 62%, rgba(45,175,235,0.16) 84%, transparent 84%, transparent 100%)",
        /* Teal wash - top-left */
        "linear-gradient(140deg, rgba(18,140,175,0.28) 0%, transparent 44%)",
        /* Vibrant sky blue wash - top-right */
        "linear-gradient(220deg, rgba(45,135,225,0.26) 0%, transparent 44%)",
        /* Cyan aqua wash - bottom-right */
        "linear-gradient(310deg, rgba(70,195,235,0.22) 0%, transparent 42%)",
        /* Soft white wash - center, brightens the middle */
        "linear-gradient(180deg, transparent 20%, rgba(255,255,255,0.32) 50%, transparent 80%)",
        /* Base: pale blue-teal to off-white to pale azure */
        "linear-gradient(150deg, #d4ecf5 0%, #b8dcee 35%, #eef6f9 65%, #c0dcec 100%)",
      ].join(",")
    : [
        /* Diagonal stripe band 1 */
        "linear-gradient(123deg, transparent 0%, transparent 34%, rgba(14,100,180,0.10) 34%, rgba(14,100,180,0.10) 54%, transparent 54%, transparent 100%)",
        /* Diagonal stripe band 2 */
        "linear-gradient(251deg, transparent 0%, transparent 62%, rgba(200,50,150,0.09) 62%, rgba(200,50,150,0.09) 84%, transparent 84%, transparent 100%)",
        /* Teal wash - top-left */
        "linear-gradient(140deg, rgba(18,140,160,0.25) 0%, transparent 42%)",
        /* Blue wash - top-right */
        "linear-gradient(220deg, rgba(14,80,200,0.18) 0%, transparent 40%)",
        /* Pink wash - bottom-right */
        "linear-gradient(310deg, rgba(210,50,140,0.18) 0%, transparent 40%)",
        /* Purple accent - center */
        "linear-gradient(180deg, transparent 20%, rgba(100,50,200,0.08) 50%, transparent 80%)",
        /* Base: deep, rich, saturated */
        "linear-gradient(150deg, #bde0ec 0%, #d0c0e8 35%, #eac0d8 65%, #bed8ec 100%)",
      ].join(",");

  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      {/* Gradient base with diagonal stripes */}
      <div className="absolute inset-0" style={{ backgroundImage }} />
      {/* Static Lego-style square grid */}
      <StaticGrid variant={variant} />
    </div>
  );
}

/**
 * InteractiveGridOverlay - kept for API compatibility but now renders nothing
 * (interactivity has been removed per user request).
 */
export function InteractiveGridOverlay() {
  return null;
}

export default function InteractiveGrid({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className ?? ""}`}>
      <InteractiveGridBackground />
      <div className={`relative mx-auto h-full w-full ${contentClassName ?? ""}`}>
        {children}
      </div>
    </div>
  );
}
