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
  const visibleRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center"
      style={{ minHeight: "380px" }}
    >
      <div className="relative w-full" style={{ maxWidth: "460px", height: "340px" }}>
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
            x = 110; y = 0; scale = 1; zIndex = 3; opacity = 1; rotate = 0;
          } else if (offset === 1) {
            // Right card
            x = 230; y = 12; scale = 0.88; zIndex = 2; opacity = 0.5; rotate = 5;
          } else {
            // Left card
            x = -10; y = 12; scale = 0.88; zIndex = 1; opacity = 0.5; rotate = -5;
          }

          return (
            <div
              key={i}
              className="absolute top-0 left-0"
              style={{
                width: "240px",
                height: "340px",
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
                width={240}
                height={340}
                className="w-full h-full object-cover"
                style={{
                  borderRadius: "28px",
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
