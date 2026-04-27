"use client";

import { memo, useEffect, useState } from "react";

/**
 * Scroll-triggered diagonal blue strips for the testimonials page.
 *
 * Three semi-transparent strips at fixed Y positions in the document.
 * Each one starts collapsed (scaleX 0) and "rips" across the screen on
 * a single ease-out-expo pass when the user scrolls past it.
 *
 * Reveal trigger: a window scroll listener (not IntersectionObserver,
 * because a scaleX(0) element has zero width and IO won't fire on it).
 * Each strip reveals when scrollY passes (topPx - 0.6 * viewport height),
 * which lines up roughly with "the strip's row is in the lower half of
 * the viewport" — the moment that feels right for the rip to start.
 *
 * Visible on every viewport. No media query, not mobile-only.
 */

type Stripe = {
  topPx: number;
  angle: number;
  color: string;
  height: number;
  origin: "left" | "right";
};

// Teal palette — matches the testimonials page's InteractiveGrid background.
const STRIPES_TEAL: Stripe[] = [
  { topPx: 1100, angle: 24,  color: "rgba(35,  95, 210, 0.22)", height: 110, origin: "left"  },
  { topPx: 2100, angle: -28, color: "rgba(70, 195, 235, 0.24)", height: 95,  origin: "right" },
  { topPx: 3000, angle: 18,  color: "rgba(18, 140, 175, 0.26)", height: 130, origin: "left"  },
];

// Default palette (purple/pink/blue) — matches the About page's InteractiveGrid.
const STRIPES_DEFAULT: Stripe[] = [
  { topPx: 1100, angle: 24,  color: "rgba(14,  80, 200, 0.18)", height: 110, origin: "left"  },
  { topPx: 2100, angle: -28, color: "rgba(210, 50, 140, 0.18)", height: 95,  origin: "right" },
  { topPx: 3000, angle: 18,  color: "rgba(100, 50, 200, 0.18)", height: 130, origin: "left"  },
];

type Variant = "teal" | "default";

function ScrollStripsImpl({ variant = "teal" }: { variant?: Variant }) {
  const stripes = variant === "default" ? STRIPES_DEFAULT : STRIPES_TEAL;
  const [scrollY, setScrollY] = useState(0);
  const [vh, setVh] = useState(0);

  useEffect(() => {
    const update = function () {
      setScrollY(window.scrollY);
      setVh(window.innerHeight);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return function () {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {stripes.map(function (s, i) {
        const triggerY = s.topPx - vh * 0.6;
        const revealed = scrollY > triggerY;
        return (
          <div
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              top: s.topPx + "px",
              left: "-20%",
              width: "140%",
              height: s.height + "px",
              background: s.color,
              transform: `rotate(${s.angle}deg) scaleX(${revealed ? 1 : 0})`,
              transformOrigin: `${s.origin} center`,
              transition: "transform 1500ms cubic-bezier(0.19, 1, 0.22, 1)",
              // Sharp edges — no blur, so the strip reads as a clean band
              // rather than a soft wash.
              willChange: "transform",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
}

export const ScrollStrips = memo(ScrollStripsImpl);
