"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";

function UniSelectorAnimation({ onComplete }: { onComplete?: () => void }) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function getCenter(id: string) {
    const card = document.getElementById(`uni-${id}`);
    const container = containerRef.current;
    if (!card || !container) return { x: 0, y: 0 };
    const cr = card.getBoundingClientRect();
    const pr = container.getBoundingClientRect();
    return { x: cr.left - pr.left + cr.width / 2, y: cr.top - pr.top + cr.height / 2 };
  }

  function moveTo(x: number, y: number): Promise<void> {
    return new Promise(r => {
      const cursor = cursorRef.current;
      if (cursor) { cursor.style.left = (x - 6) + 'px'; cursor.style.top = (y - 4) + 'px'; }
      setTimeout(r, 320);
    });
  }

  function clickOn(id: string): Promise<void> {
    return new Promise(r => {
      const pos = getCenter(id);
      const ring = ringRef.current;
      if (ring) {
        ring.style.left = pos.x + 'px'; ring.style.top = pos.y + 'px';
        ring.classList.remove('uni-ring-animate');
        void ring.offsetWidth;
        ring.classList.add('uni-ring-animate');
      }
      setTimeout(() => setSelected(prev => new Set(prev).add(id)), 80);
      setTimeout(r, 250);
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (cancelled) return;
      setSelected(new Set());
      await new Promise(r => setTimeout(r, 400));
      const cursor = cursorRef.current;
      if (!cursor || cancelled) return;
      const sp = getCenter('oxford');
      cursor.style.left = (sp.x + 80) + 'px'; cursor.style.top = (sp.y - 60) + 'px';
      cursor.style.opacity = '1';
      cursor.style.transition = 'opacity 0.2s, left 0.3s cubic-bezier(0.4,0,0.2,1), top 0.3s cubic-bezier(0.4,0,0.2,1)';
      await new Promise(r => setTimeout(r, 300));
      if (cancelled) return;
      const c = getCenter('cambridge'); await moveTo(c.x, c.y); await clickOn('cambridge');
      await new Promise(r => setTimeout(r, 200)); if (cancelled) return;
      const y = getCenter('yale'); await moveTo(y.x, y.y); await clickOn('yale');
      await new Promise(r => setTimeout(r, 200)); if (cancelled) return;
      const l = getCenter('lse'); await moveTo(l.x, l.y); await clickOn('lse');
      await new Promise(r => setTimeout(r, 300)); if (cancelled) return;
      cursor.style.opacity = '0';
      await new Promise(r => setTimeout(r, 1200)); if (cancelled) return;
      if (onComplete) onComplete();
    }
    const t = setTimeout(run, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const logoSize = "w-[80px] h-[80px] md:w-[120px] md:h-[120px]";
  const cardClass = (id: string) =>
    `${logoSize} rounded-xl overflow-hidden relative border-[3px] transition-all duration-150 flex-shrink-0 ` +
    (selected.has(id) ? 'border-green-500 scale-[1.04]' : 'border-transparent');

  const logos = [
    { id: 'oxford',   src: '/Unilogos/Oxford Logo.png',   alt: 'Oxford' },
    { id: 'cambridge',src: '/Unilogos/Cambridge Logo.png', alt: 'Cambridge' },
    { id: 'lse',      src: '/Unilogos/LSE Logo.png',       alt: 'LSE' },
    { id: 'harvard',  src: '/Unilogos/Harvard Logo.png',   alt: 'Harvard' },
    { id: 'yale',     src: '/Unilogos/Yale Logo.png',       alt: 'Yale' },
    { id: 'columbia', src: '/Unilogos/Columbia Logo.png',  alt: 'Columbia' },
  ];

  return (
    <div className="flex items-center gap-3 w-full justify-center">
      <div className="hidden md:flex flex-col gap-3 flex-shrink-0" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 100%)' }}>
        {['/Unilogos/MIT Logo.png', '/Unilogos/Caltech Logo.png'].map((src, i) => (
          <div key={i} className={`${logoSize} rounded-xl overflow-hidden opacity-25 relative`}>
            <Image src={src} alt="" fill className="object-cover" sizes="120px" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="relative flex-shrink-0" ref={containerRef}>
        <div className="grid grid-cols-3 gap-3">
          {logos.map(({ id, src, alt }) => (
            <div key={id} id={`uni-${id}`} className={cardClass(id)}>
              <Image src={src} alt={alt} fill className="object-cover" sizes="120px" loading="lazy" />
              {selected.has(id) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3.5 h-3.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={cursorRef} className="absolute pointer-events-none z-50 w-12 h-12" style={{ opacity: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
          <svg viewBox="0 0 24 24" fill="white" stroke="#222" strokeWidth="1.2" className="w-full h-full">
            <path d="M4 2l16 10-7 1-4 7z"/>
          </svg>
        </div>
        <div ref={ringRef} className="absolute pointer-events-none z-40 w-10 h-10 rounded-full border-2 border-blue-400/70" style={{ opacity: 0, transform: 'translate(-50%,-50%) scale(0)' }} />
      </div>
      <div className="hidden md:flex flex-col gap-3 flex-shrink-0" style={{ maskImage: 'linear-gradient(to left, transparent 0%, black 100%)', WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 100%)' }}>
        {['/Unilogos/UCLA Logo.png', '/Unilogos/UCL Logo.png'].map((src, i) => (
          <div key={i} className={`${logoSize} rounded-xl overflow-hidden opacity-25 relative`}>
            <Image src={src} alt="" fill className="object-cover" sizes="120px" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WordBubblesAnimation({ onComplete }: { onComplete?: () => void }) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const rows = [
    [
      { label: 'A-Levels - Physics' },
      { label: 'Oxbridge Interviews' },
      { label: 'Personal Statement' },
      { label: 'A-Levels - Economics' },
    ],
    [
      { label: 'IGCSE' },
      { label: 'A-Levels - Chemistry' },
      { label: 'Extracurricular Building' },
      { label: 'SAT - Math' },
    ],
    [
      { label: 'Admissions Test - TMUA' },
      { label: 'SAT - English' },
      { label: 'Admissions Test - TSA' },
      { label: 'Admissions Test - LNAT' },
    ],
  ];

  const clickTargets = [1, 6, 9];

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (cancelled) return;
      setSelected(new Set());
      await new Promise(r => setTimeout(r, 400));
      const cursor = cursorRef.current;
      const container = containerRef.current;
      if (!cursor || !container || cancelled) return;
      cursor.style.transition = 'none';
      cursor.style.left = '350px';
      cursor.style.top = '60px';
      void cursor.offsetWidth;
      cursor.style.opacity = '1';
      cursor.style.transition = 'opacity 0.25s, left 0.4s cubic-bezier(0.4,0,0.2,1), top 0.4s cubic-bezier(0.4,0,0.2,1)';
      await new Promise(r => setTimeout(r, 300));
      for (const idx of clickTargets) {
        if (cancelled) return;
        const el = document.getElementById(`wb-${idx}`);
        if (!el) continue;
        const cr = el.getBoundingClientRect();
        const pr = container.getBoundingClientRect();
        const tx = cr.left - pr.left + cr.width / 2;
        const ty = cr.top - pr.top + cr.height / 2;
        cursor.style.left = (tx - 6) + 'px';
        cursor.style.top = (ty - 4) + 'px';
        await new Promise(r => setTimeout(r, 400));
        if (cancelled) return;
        const ring = ringRef.current;
        if (ring) {
          ring.style.left = tx + 'px'; ring.style.top = ty + 'px';
          ring.classList.remove('uni-ring-animate');
          void ring.offsetWidth;
          ring.classList.add('uni-ring-animate');
        }
        await new Promise(r => setTimeout(r, 80));
        setSelected(prev => new Set(prev).add(idx));
        await new Promise(r => setTimeout(r, 450));
      }
      await new Promise(r => setTimeout(r, 1100)); if (cancelled) return;
      cursor.style.opacity = '0';
      await new Promise(r => setTimeout(r, 400)); if (cancelled) return;
      if (onComplete) onComplete();
    }
    const t = setTimeout(run, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  return (
    <div className="w-full flex items-center justify-center" style={{ overflow: 'hidden' }}>
      <div
        className="relative"
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '12px 0 16px',
          maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-center gap-2 md:gap-3 w-full flex-nowrap">
              {row.map((bubble, colIdx) => {
                const globalIdx = rowIdx * 4 + colIdx;
                const isSelected = selected.has(globalIdx);
                return (
                  <div
                    key={globalIdx}
                    id={`wb-${globalIdx}`}
                    className="flex-shrink-0"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '50px',
                      background: isSelected ? '#0d9488' : '#f3f4f6',
                      color: isSelected ? '#fff' : '#374151',
                      fontSize: '12px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      border: isSelected ? '2px solid #0d9488' : '2px solid transparent',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: isSelected ? '0 4px 20px rgba(13,148,136,0.3)' : 'none',
                      transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  >
                    {bubble.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div ref={cursorRef} className="absolute pointer-events-none z-50 w-12 h-12" style={{ opacity: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
          <svg viewBox="0 0 24 24" fill="white" stroke="#222" strokeWidth="1.2" className="w-full h-full">
            <path d="M4 2l16 10-7 1-4 7z"/>
          </svg>
        </div>
        <div ref={ringRef} className="absolute pointer-events-none z-40 w-10 h-10 rounded-full border-2 border-teal-500/70" style={{ opacity: 0, transform: 'translate(-50%,-50%) scale(0)' }} />
      </div>
    </div>
  );
}

function JoinPlatformAnimation() {
  const [phase, setPhase] = useState<'uni' | 'bubbles'>('uni');
  const [fading, setFading] = useState(false);
  const [inView, setInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Only start the animation when it scrolls into view
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function switchTo(next: 'uni' | 'bubbles') {
    setFading(true);
    setTimeout(() => {
      setPhase(next);
      setFading(false);
    }, 350);
  }

  const label = phase === 'uni'
    ? "What universities are you interested in?"
    : "What do you need help with?";

  return (
    <div ref={wrapperRef} className="w-full flex flex-col items-center gap-5">
      <p className="text-sm font-medium text-foreground/70">{label}</p>
      <div
        className="w-full flex items-center justify-center"
        style={{
          height: '380px',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.35s ease',
          overflow: 'visible',
        }}
      >
        {inView && (phase === 'uni' ? (
          <UniSelectorAnimation key="uni" onComplete={() => switchTo('bubbles')} />
        ) : (
          <WordBubblesAnimation key="bubbles" onComplete={() => switchTo('uni')} />
        ))}
      </div>
    </div>
  );
}

export function ScrollStep({ title, description, reverse, videoSrc, mediaContent, wideMedia }: {
  title: string;
  description: string;
  reverse?: boolean;
  videoSrc?: string;
  mediaContent?: React.ReactNode;
  wideMedia?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const textContent = (
    <div
      className="flex flex-col justify-center min-w-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.3)',
        transition: 'opacity 700ms cubic-bezier(0.34,1.56,0.64,1), transform 700ms cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground leading-tight">{title}</h3>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-full md:max-w-md">{description}</p>
    </div>
  );

  const videoPlaceholder = (
    <div
      className="min-w-0 overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.3)',
        transition: 'opacity 700ms cubic-bezier(0.34,1.56,0.64,1) 100ms, transform 700ms cubic-bezier(0.34,1.56,0.64,1) 100ms',
      }}
    >
      {mediaContent ? (
        <div className="w-full flex items-center justify-center">
          {mediaContent}
        </div>
      ) : videoSrc ? (
        <div className="w-full flex items-center justify-center">
          <JoinPlatformAnimation />
        </div>
      ) : (
        <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-[#e8f4f4] to-[#c7e4e4] border border-[#c2d8d2]/50 flex items-center justify-center shadow-md">
          <div className="flex flex-col items-center gap-3 text-[#128ca0]/50">
            <div className="h-14 w-14 rounded-full bg-[#128ca0]/10 flex items-center justify-center">
              <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium">Video coming soon</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={ref}
      className="w-full flex items-center py-10 md:py-12 border-b border-[#c2d8d2]/20 last:border-0"
    >
      <div className="container mx-auto px-4 md:px-16 max-w-screen-xl overflow-hidden">
        <div className={`grid ${wideMedia ? 'md:grid-cols-[minmax(0,240px)_1fr] md:gap-6' : 'md:grid-cols-2 md:gap-12'} gap-8 items-center overflow-hidden ${reverse ? 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1' : ''}`}>
          {textContent}
          {videoPlaceholder}
        </div>
      </div>
    </div>
  );
}
