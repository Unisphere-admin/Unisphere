"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const CARDS = [
  { src: "/cards/1.webp", alt: "Ivan Silkin - NYU" },
  { src: "/cards/2.webp", alt: "Gha Yuan Ng - Yale" },
  { src: "/cards/3.webp", alt: "Eva Ong - Cambridge" },
];

const CYCLE_MS = 3000;

/**
 * Minimalistic card carousel.
 * Cards spread out horizontally -- the active card is centered,
 * the other two fan out to the left and right.
 */
const RevolvingCards = React.memo(function RevolvingCards() {
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const visibleRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track viewport so the card layout shrinks on mobile (~half scale).
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Pause when off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cycle through cards
  useEffect(() => {
    const interval = setInterval(() => {
      if (visibleRef.current) {
        setActive((prev) => (prev + 1) % CARDS.length);
      }
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  // Size values: mobile is roughly half of desktop. Positions recomputed
  // so the center card is still centered inside the track and the fan
  // angles stay visually consistent at either size.
  const cardW         = isMobile ? 130 : 240;
  const cardH         = isMobile ? 184 : 340;
  const trackMaxWidth = isMobile ? 260 : 460;
  const trackHeight   = isMobile ? 184 : 340;
  const minHeight     = isMobile ? 210 : 380;
  const pos = isMobile
    ? { center: 65,  right: 125, left: -5,  yOff: 6  }
    : { center: 110, right: 230, left: -10, yOff: 12 };
  const radius = isMobile ? 16 : 28;

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center"
      style={{ minHeight: `${minHeight}px` }}
    >
      <div
        className="relative mx-auto"
        style={{ maxWidth: `${trackMaxWidth}px`, width: `${trackMaxWidth}px`, height: `${trackHeight}px` }}
      >
        {CARDS.map((card, i) => {
          const offset = (i - active + CARDS.length) % CARDS.length;

          let x = 0;
          let y = 0;
          let scale = 1;
          let zIndex = 3;
          let opacity = 1;
          let rotate = 0;

          if (offset === 0) {
            // Front center card
            x = pos.center; y = 0; scale = 1; zIndex = 3; opacity = 1; rotate = 0;
          } else if (offset === 1) {
            // Right card
            x = pos.right; y = pos.yOff; scale = 0.88; zIndex = 2; opacity = 0.5; rotate = 5;
          } else {
            // Left card
            x = pos.left; y = pos.yOff; scale = 0.88; zIndex = 1; opacity = 0.5; rotate = -5;
          }

          return (
            <div
              key={i}
              className="absolute top-0 left-0"
              style={{
                width: `${cardW}px`,
                height: `${cardH}px`,
                transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotate}deg)`,
                zIndex,
                opacity,
                transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: "transform, opacity",
              }}
            >
              <Image
                src={card.src}
                alt={card.alt}
                width={cardW}
                height={cardH}
                className="w-full h-full object-cover"
                style={{
                  borderRadius: `${radius}px`,
                  boxShadow: offset === 0
                    ? "0 12px 40px rgba(0,0,0,0.12)"
                    : "0 4px 16px rgba(0,0,0,0.06)",
                }}
                priority={i === 0}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export { RevolvingCards };
