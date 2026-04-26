"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

// Positions computed via physics-based circle packing (pack-circles.js)
// Big: Harvard, Yale, Oxford, Cambridge, Stanford, Imperial (14-16%)
// Small: Durham, NYU, UCLA (7-8%)
// Others: medium (10-13%)
// Verified: zero overlaps, 3.6% minimum gap
const LOGOS = [
  { name: "Harvard", src: "/Unilogos/Harvard Logo.png", x: 33.9, y: 17.0, size: 14 },
  { name: "Yale", src: "/Unilogos/Yale Logo.png", x: 50.4, y: 14.6, size: 14 },
  { name: "Oxford", src: "/Unilogos/Oxford Logo.png", x: 15.0, y: 58.7, size: 15 },
  { name: "Cambridge", src: "/Unilogos/Cambridge Logo.png", x: 67.4, y: 19.9, size: 15 },
  { name: "Stanford", src: "/Unilogos/Stanford Logo.png", x: 81.3, y: 31.2, size: 14 },
  { name: "MIT", src: "/Unilogos/MIT Logo.png", x: 86.4, y: 61.9, size: 12 },
  { name: "LSE", src: "/Unilogos/LSE Logo.png", x: 74.3, y: 70.7, size: 11 },
  { name: "Columbia", src: "/Unilogos/Columbia Logo.png", x: 66.6, y: 35.2, size: 10 },
  { name: "UCL", src: "/Unilogos/UCL Logo.png", x: 30.2, y: 60.1, size: 10 },
  { name: "Durham", src: "/Unilogos/Durham Logo.png", x: 74.8, y: 42.9, size: 8 },
  { name: "Imperial", src: "/Unilogos/Imperial Logo.png", x: 65.1, y: 84.6, size: 16 },
  { name: "Princeton", src: "/Unilogos/Princeton Logo.png", x: 72.9, y: 56.1, size: 13 },
  { name: "Brown", src: "/Unilogos/Brown Logo.png", x: 44.8, y: 85.1, size: 13 },
  { name: "KCL", src: "/Unilogos/KCL Logo.png", x: 53.8, y: 72.9, size: 12 },
  { name: "NYU", src: "/Unilogos/NYU Logo.png", x: 63.9, y: 65.4, size: 7 },
  { name: "UPenn", src: "/Unilogos/UPenn Logo.png", x: 18.4, y: 42.9, size: 12 },
  { name: "Warwick", src: "/Unilogos/Warwick Logo.png", x: 38.8, y: 70.3, size: 12 },
  { name: "Cornell", src: "/Unilogos/Cornell Logo.png", x: 24.5, y: 29.0, size: 11 },
  { name: "Caltech", src: "/Unilogos/Caltech Logo.png", x: 24.2, y: 71.9, size: 11 },
  { name: "UChicago", src: "/Unilogos/UChicago Logo.png", x: 41.2, y: 29.6, size: 10 },
  { name: "UCLA", src: "/Unilogos/UCLA Logo.png", x: 29.3, y: 48.7, size: 7 },
  { name: "UC Berkeley", src: "/Unilogos/UCBerkeley Logo.png", x: 55.0, y: 28.3, size: 10 },
] as const;

// Center of rotation
const CX = 50;
const CY = 50;

// Full revolution in ~120 seconds
const ORBIT_SPEED = (2 * Math.PI) / 96;

// Scale pulsing -- stronger breathing (0.15 amplitude = 0.85x to 1.15x)
// Safe: worst case two 16% logos at max = 16*0.15*2 = 4.8% < 2*3.6% gap
// Actually per-side: 16*0.15 = 2.4% per logo, two adjacent = 4.8%,
// but gap is measured center-to-center minus radii, so effective gap reduction
// is (r1_extra + r2_extra) = 1.2 + 1.2 = 2.4% which is < 3.6%. Safe.
const SCALE_AMP = 0.15;
const SCALE_PHASES = LOGOS.map((_, i) => ((i * 137.508) % 360) * (Math.PI / 180));
const SCALE_PERIODS = LOGOS.map((_, i) => 5 + (i % 7) * 1.2);
const DOES_PULSE = LOGOS.map((_, i) => i % 5 !== 2);

export const UniversityOrbit = memo(function UniversityOrbit() {
  const [hasEntered, setHasEntered] = useState(false);
  const [orbitReady, setOrbitReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const visibleRef = useRef(true);
  const logoRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setLogoRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    logoRefs.current[index] = el;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasEntered) return;
    const timer = setTimeout(() => setOrbitReady(true), 2000);
    return () => clearTimeout(timer);
  }, [hasEntered]);

  // Pause animation when component is off-screen to save CPU/GPU
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // GPU-composited orbit animation
  // Only `transform` changes each frame = compositor-only, no layout/paint = 60fps
  useEffect(() => {
    if (!orbitReady) return;
    const container = containerRef.current;
    if (!container) return;

    let angle = 0;
    let lastTime = performance.now();
    const FRAME_INTERVAL = 1000 / 60;
    const cachedDims = { w: 0, h: 0 };
    const resizeObs = new ResizeObserver(() => { cachedDims.w = 0; cachedDims.h = 0; });
    resizeObs.observe(container); // Cap at 30fps - orbit is slow, no visual difference
    let timeSinceLastFrame = 0;

    function tick(now: number) {
      rafRef.current = requestAnimationFrame(tick);

      // Skip work when off-screen -- saves CPU/GPU while scrolled away
      if (!visibleRef.current) {
        lastTime = now;
        return;
      }

      const elapsed = now - lastTime;
      timeSinceLastFrame += elapsed;
      lastTime = now;

      // Throttle to 30fps
      if (timeSinceLastFrame < FRAME_INTERVAL) return;
      const dt = timeSinceLastFrame / 1000;
      timeSinceLastFrame = 0;
      angle += ORBIT_SPEED * dt;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      // Cache dimensions - only re-read on resize, not every frame
      if (!cachedDims.w) {
        cachedDims.w = container!.offsetWidth;
        cachedDims.h = container!.offsetHeight;
      }
      const cw = cachedDims.w;
      const ch = cachedDims.h;

      for (let i = 0; i < LOGOS.length; i++) {
        const div = logoRefs.current[i];
        if (!div) continue;

        const logo = LOGOS[i];

        // Rigid-body rotation around (CX, CY) -- preserves all distances
        const dx = logo.x - CX;
        const dy = logo.y - CY;
        const nx = CX + dx * cosA - dy * sinA;
        const ny = CY + dx * sinA + dy * cosA;

        // Scale pulsing
        let scale = 1;
        if (DOES_PULSE[i]) {
          scale = 1 + SCALE_AMP * Math.sin(
            (now / 1000) * (2 * Math.PI / SCALE_PERIODS[i]) + SCALE_PHASES[i]
          );
        }

        // Compute pixel offset from the element's static base position
        // Base position (set in JSX): left = (logo.x - logo.size/2)%, top = (logo.y - logo.size/2)%
        const baseLeftPx = ((logo.x - logo.size / 2) / 100) * cw;
        const baseTopPx = ((logo.y - logo.size / 2) / 100) * ch;

        // Target position after rotation (center of the scaled logo)
        const targetCenterX = (nx / 100) * cw;
        const targetCenterY = (ny / 100) * ch;

        // The element's current center (before transform) is at:
        const baseCenterX = baseLeftPx + (logo.size / 100 * cw) / 2;
        const baseCenterY = baseTopPx + (logo.size / 100 * ch) / 2;

        // Translate delta in pixels
        const translateX = targetCenterX - baseCenterX;
        const translateY = targetCenterY - baseCenterY;

        // GPU-composited transform: translate3d for position, scale for breathing
        // translate3d triggers GPU layer promotion, scale transforms from center
        div.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); resizeObs.disconnect(); };
  }, [orbitReady]);

  return (
    <div
      className="relative w-full"
      style={{ paddingBottom: "100%" }}
    >
      <div className="absolute inset-0" ref={containerRef}>
        {/* Center Unisphere logo -- stays fixed */}
        <div
          className="absolute"
          style={{
            width: "28%",
            height: "28%",
            left: "36%",
            top: "36%",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
            opacity: hasEntered ? 1 : 0,
            transform: hasEntered ? "scale(1)" : "scale(0.5)",
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 45% 40%, #a8e0e8 0%, #5abcc7 30%, #128ca0 70%, #0e6b68 100%)",
              boxShadow:
                "0 12px 48px rgba(18, 140, 160, 0.35), 0 4px 16px rgba(0,0,0,0.1), inset 0 -4px 12px rgba(0,0,0,0.1), inset 0 4px 12px rgba(255,255,255,0.2)",
            }}
          >
            <Image
              src="/logo.png"
              alt="Unisphere"
              width={400}
              height={332}
              className="w-[52%] h-auto object-contain brightness-0 invert opacity-90"
              draggable={false}
              priority
            />
          </div>
        </div>

        {/* University logos -- orbit via GPU-composited transforms */}
        {LOGOS.map((logo, index) => {
          const entranceDelay = 0.15 + index * 0.04;

          return (
            <div
              key={logo.name}
              ref={setLogoRef(index)}
              className="absolute"
              style={{
                width: `${logo.size}%`,
                height: `${logo.size}%`,
                left: `${logo.x - logo.size / 2}%`,
                top: `${logo.y - logo.size / 2}%`,
                willChange: orbitReady ? "transform" : undefined,
                transition: orbitReady
                  ? "none"
                  : `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${entranceDelay}s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${entranceDelay}s`,
                opacity: hasEntered ? 1 : 0,
                transform: hasEntered && !orbitReady ? "scale(1)" : (!hasEntered ? "scale(0.3)" : undefined),
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden relative"
                style={{
                  boxShadow:
                    "0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                <Image
                  src={logo.src}
                  alt={logo.name}
                  fill
                  sizes="(max-width: 768px) 20vw, 12vw"
                  quality={80}
                  className="object-cover"
                  draggable={false}
                  loading="lazy"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
