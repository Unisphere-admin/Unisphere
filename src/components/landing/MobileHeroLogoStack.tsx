"use client";

import React, { memo, useEffect, useRef, useState } from "react";

/**
 * Mobile-only revolving university logos for the home hero.
 *
 * Eight logos travel around a circular path whose centre is pinned to the
 * right edge of the hero, vertically aligned with the "Dream" word. The
 * vertical alignment is done in JS so it tracks Dream's actual position
 * regardless of viewport / text wrapping.
 *
 * Motion is now smooth and continuous (no more Geneva-drive pauses), at
 * a slightly slower pace. Each tile pulses scale as it travels: very
 * small at the off-screen edges, peaking large at the leftmost (deepest
 * into screen) point. The scale contrast is intentionally strong so the
 * "approaching the camera" effect reads clearly.
 *
 * Hidden on md+ — desktop has the rotating UniversityOrbit.
 */

type Logo = { name: string; src: string };

const LOGOS: Logo[] = [
  { name: "Caltech",   src: "/Unilogos/Caltech Logo.png" },
  { name: "UCLA",      src: "/Unilogos/UCLA Logo.png" },
  { name: "MIT",       src: "/Unilogos/MIT Logo.png" },
  { name: "Imperial",  src: "/Unilogos/Imperial Logo.png" },
  { name: "Harvard",   src: "/Unilogos/Harvard Logo.png" },
  { name: "Stanford",  src: "/Unilogos/Stanford Logo.png" },
  { name: "Yale",      src: "/Unilogos/Yale Logo.png" },
  { name: "Cambridge", src: "/Unilogos/Cambridge Logo.png" },
];

// Slightly slower than the previous stepped 22s — continuous motion needs
// more time to feel ambient.
//
// Sizes are tuned so the leftmost peak (where a tile reaches scale 1.15)
// stays within the right ~110px of the viewport. The text column reserves
// 120px on the right via padding, leaving a small buffer between the orbit's
// reach and the headline edge on every mobile width.
const PERIOD_S = 28;
const TILE_PX = 48;
const RADIUS_PX = 84;

/**
 * Find the "Dream" word in the hero headline and return its centre Y
 * relative to the orbit's positioning ancestor (the hero section).
 */
function getDreamTopPx(orbitEl: HTMLElement | null): number | null {
  if (!orbitEl) return null;
  const positioningParent = orbitEl.offsetParent as HTMLElement | null;
  if (!positioningParent) return null;
  const allSpans = positioningParent.querySelectorAll("span");
  let dream: HTMLElement | null = null;
  allSpans.forEach((s) => {
    if (!dream && s.textContent && s.textContent.trim() === "Dream") {
      dream = s as HTMLElement;
    }
  });
  if (!dream) return null;
  const dreamRect = (dream as HTMLElement).getBoundingClientRect();
  const parentRect = positioningParent.getBoundingClientRect();
  return dreamRect.top - parentRect.top + dreamRect.height / 2;
}

function MobileHeroLogoStackImpl() {
  const orbitRef = useRef<HTMLDivElement | null>(null);
  const [topPx, setTopPx] = useState<number | null>(null);

  useEffect(() => {
    const update = function () {
      const el = orbitRef.current;
      if (!el) return;
      const y = getDreamTopPx(el);
      if (y !== null) setTopPx(y);
    };
    update();
    const ro = new ResizeObserver(update);
    if (orbitRef.current?.offsetParent) ro.observe(orbitRef.current.offsetParent);
    window.addEventListener("resize", update);
    // The hero's letter-cascade animation moves Dream into place over ~1.2s;
    // remeasure a couple of times to catch the final position.
    const t1 = setTimeout(update, 200);
    const t2 = setTimeout(update, 1500);
    return function () {
      window.removeEventListener("resize", update);
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Small fine-tuning offset: nudge the orbit down ~12px below Dream's
  // exact centre, since the visual peak feels better slightly lower than
  // the headline's optical centre.
  const orbitStyle: React.CSSProperties = topPx === null
    ? { visibility: "hidden" }
    : { top: topPx + 12 + "px" };

  return (
    <div ref={orbitRef} className="mhls-orbit md:hidden" aria-hidden style={orbitStyle}>
      {LOGOS.map(function (logo, i) {
        const delay = -(PERIOD_S * i) / LOGOS.length;
        const style = { animationDelay: delay + "s" } as React.CSSProperties;
        return (
          <div key={logo.name} className="mhls-wrap" style={style}>
            <div className="mhls-counter" style={style}>
              <div className="mhls-scale" style={style}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.src}
                  alt={logo.name}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "cover",
                    borderRadius: "12px",
                    boxShadow:
                      "0 12px 28px -4px rgba(11, 43, 58, 0.45), 0 4px 10px -2px rgba(11, 43, 58, 0.25)",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .mhls-orbit {
          /* Pinned slightly past the right edge so the visible peak sits
             a touch closer to the right side of the screen than before.
             Vertical position is set inline by the effect above (Dream's
             centre Y, with a small downward nudge applied). */
          position: absolute;
          right: -8px;
          width: 0;
          height: 0;
          pointer-events: none;
          z-index: 1;
        }

        .mhls-wrap {
          position: absolute;
          left: -${TILE_PX / 2}px;
          top: -${TILE_PX / 2}px;
          width: ${TILE_PX}px;
          height: ${TILE_PX}px;
          animation: mhls-orbit ${PERIOD_S}s linear infinite;
          transform-origin: ${TILE_PX / 2}px ${TILE_PX / 2}px;
        }
        .mhls-counter {
          width: 100%;
          height: 100%;
          animation: mhls-counter ${PERIOD_S}s linear infinite;
          transform-origin: 50% 50%;
        }
        .mhls-scale {
          /* Scale uses ease-in-out so the growth is faster near the peak,
             softer at the edges — accentuates the "approaching the camera"
             feel. */
          width: 100%;
          height: 100%;
          animation: mhls-scale ${PERIOD_S}s ease-in-out infinite;
          transform-origin: 50% 50%;
        }

        /* Smooth continuous rotation — no more pauses. */
        @keyframes mhls-orbit {
          from { transform: rotate(0deg)   translateX(${RADIUS_PX}px); }
          to   { transform: rotate(360deg) translateX(${RADIUS_PX}px); }
        }
        @keyframes mhls-counter {
          from { transform: rotate(0deg);    }
          to   { transform: rotate(-360deg); }
        }
        /* Scale contrast: small at off-screen edges, peak at the leftmost
           point (angle 180°). Peak tuned to 1.15 so the tile doesn't bloat
           into the headline text — the right ~120px padding on the headline
           leaves enough buffer for this peak. */
        @keyframes mhls-scale {
          0%   { transform: scale(0.40); }   /* angle 0°, far right edge */
          25%  { transform: scale(0.70); }   /* angle 90°, off-screen top */
          50%  { transform: scale(1.15); }   /* angle 180°, peak */
          75%  { transform: scale(0.70); }   /* angle 270°, off-screen bottom */
          100% { transform: scale(0.40); }   /* back to angle 0° */
        }

        @media (prefers-reduced-motion: reduce) {
          .mhls-wrap,
          .mhls-counter,
          .mhls-scale { animation: none; }
          .mhls-wrap:nth-child(1) { transform: rotate(135deg) translateY(-${RADIUS_PX}px); }
          .mhls-wrap:nth-child(2) { transform: rotate(180deg) translateY(-${RADIUS_PX}px); }
          .mhls-wrap:nth-child(3) { transform: rotate(225deg) translateY(-${RADIUS_PX}px); }
          .mhls-wrap:nth-child(4),
          .mhls-wrap:nth-child(5),
          .mhls-wrap:nth-child(6),
          .mhls-wrap:nth-child(7),
          .mhls-wrap:nth-child(8) { display: none; }
        }
      `}</style>
    </div>
  );
}

export const MobileHeroLogoStack = memo(MobileHeroLogoStackImpl);
