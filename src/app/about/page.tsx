"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  Clock,
  Award,
  CheckCircle,
  Star,
  ArrowRight,
  Globe,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback, useRef } from "react";
import { InteractiveGridBackground, InteractiveGridOverlay } from "@/components/ui/interactive-grid";

interface Story {
  id: number;
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
  images?: string[];
  linkedinUrl: string;
}

const stories: Story[] = [
  {
    id: 1,
    date: "January 2025",
    title: "Back at BISKL: Levelling Up",
    excerpt:
      "Justin Lee returned to The British International School of KL to speak to a room full of aspiring university applicants about his journey. He talked openly about the mistakes he made along the way, the importance of staying consistent, and how peer mentorship shaped his perspective more than any textbook ever could. It was the kind of honest, experience-driven conversation that most students never get access to. That same belief in the power of real peer guidance is exactly what inspired the creation of Unisphere.",
    tags: ["Community"],
    images: ["/stories/justin_1.webp", "/stories/justin_2.webp"],
    linkedinUrl: "#",
  },
  {
    id: 2,
    date: "March 2025",
    title: "Guiding Parents Through UK & US Admissions",
    excerpt:
      "Founders Joshua Ooi and Gha Yuan Ng hosted an exclusive session for parents on navigating UK and US university admissions, covering UCAS, Oxbridge interviews, holistic admissions, essays, and timelines. Families aren't short on effort. They're short on clear, up-to-date guidance.",
    tags: ["Community"],
    images: ["/stories/parents_talk_1.webp", "/stories/parents_talk_2.webp"],
    linkedinUrl: "#",
  },
  {
    id: 3,
    date: "Coming soon",
    title: "More stories on the way",
    excerpt:
      "We're just getting started. As Unisphere grows, so do the stories: student wins, community events, and milestones we can't wait to share. Stay tuned.",
    tags: ["Milestone"],
    linkedinUrl: "#",
  },
];

function StoriesCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(node);
    // eslint-disable-next-line consistent-return
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const prev = useCallback(
    () => setCurrent((c) => (c === 0 ? stories.length - 1 : c - 1)),
    []
  );
  const next = useCallback(
    () => setCurrent((c) => (c === stories.length - 1 ? 0 : c + 1)),
    []
  );

  useEffect(() => {
    if (paused || !visible) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [paused, visible, next]);

  // Shared card inner content
  const CardInner = ({ story, isCenter = true }: { story: Story; isCenter?: boolean }) => (
    <Card
      className="h-full bg-background overflow-hidden"
      style={{
        border: isCenter ? '1px solid rgba(194,216,210,0.7)' : '1px solid rgba(194,216,210,0.4)',
        boxShadow: isCenter ? '0 8px 32px rgba(18,140,160,0.12)' : '0 4px 16px rgba(0,0,0,0.07)',
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex gap-1.5 p-3 pb-0 flex-shrink-0" style={{ height: isMobile ? '180px' : '240px' }}>
          {story.images && story.images.length > 0 ? (
            story.images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`${story.title} photo ${idx + 1}`}
                className="flex-1 h-full object-cover rounded-lg"
                loading="lazy"
              />
            ))
          ) : (
            <div className="flex-1 h-full rounded-lg bg-[#c7e4e3]/30 border border-[#c2d8d2]/40 flex items-center justify-center">
              <span className="text-3xl">✦</span>
            </div>
          )}
        </div>
        <CardContent className="pt-3 pb-2 px-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{story.date}</span>
            <Badge className="bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 text-xs">
              {story.tags[0]}
            </Badge>
          </div>
          <h3 className="text-xl font-bold mb-1.5 leading-snug">{story.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4" suppressHydrationWarning>
            {story.excerpt}
          </p>
        </CardContent>
        <CardFooter className="px-4 pt-0 pb-4 mt-auto">
          <a
            href={story.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#128ca0] hover:text-[#126d94] font-medium transition-colors"
          >
            Read on LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        </CardFooter>
      </div>
    </Card>
  );

  // ── MOBILE: full-width single-card with swipe ──────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="relative px-4"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
          touchStartX.current = null;
        }}
      >
        {/* Card stack - only active card is visible, others slide off */}
        <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: '480px' }}>
          {stories.map((story, i) => (
            <div
              key={story.id}
              style={{
                position: i === current ? 'relative' : 'absolute',
                top: 0, left: 0, width: '100%',
                opacity: i === current ? 1 : 0,
                transform: `translateX(${(i - current) * 105}%)`,
                transition: 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                pointerEvents: i === current ? 'auto' : 'none',
              }}
            >
              <CardInner story={story} isCenter />
            </div>
          ))}
        </div>

        {/* Navigation row */}
        <div className="flex items-center justify-between mt-4 px-1">
          <button
            onClick={prev}
            aria-label="Previous story"
            className="h-9 w-9 rounded-full border border-[#c2d8d2] bg-background shadow-sm flex items-center justify-center hover:bg-[#c7e4e3]/30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-[#128ca0]" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {stories.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to story ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'w-5 bg-[#128ca0]' : 'w-1.5 bg-[#c2d8d2]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Next story"
            className="h-9 w-9 rounded-full border border-[#c2d8d2] bg-background shadow-sm flex items-center justify-center hover:bg-[#c7e4e3]/30 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-[#128ca0]" />
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2 opacity-50">Swipe to browse</p>
      </div>
    );
  }

  // ── DESKTOP: original 3-card fan carousel ─────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative overflow-visible"
        style={{ height: 'clamp(320px, 60vh, 540px)', perspective: '1400px' }}
      >
        {stories.map((story, i) => {
          let pos = i - current;
          if (pos > Math.floor(stories.length / 2)) pos -= stories.length;
          if (pos < -Math.floor(stories.length / 2)) pos += stories.length;

          const isCenter = pos === 0;
          const absDist = Math.abs(pos);
          const translateX = pos === 0 ? '0%' : pos < 0 ? '-88%' : '88%';
          const scale     = isCenter ? 1 : 0.82;
          const zIndex    = isCenter ? 10 : 5 - absDist;
          const opacity   = isCenter ? 1 : Math.max(0, 0.55 - (absDist - 1) * 0.4);

          return (
            <div
              key={story.id}
              onClick={() => !isCenter && setCurrent(i)}
              style={{
                position: 'absolute',
                width: '55%',
                height: '500px',
                left: '22.5%',
                transform: `translateX(${translateX}) scale(${scale})`,
                transformOrigin: pos < 0 ? 'right center' : pos > 0 ? 'left center' : 'center center',
                opacity,
                zIndex,
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden' as const,
                cursor: isCenter ? 'default' : 'pointer',
              }}
            >
              <CardInner story={story} isCenter={isCenter} />
            </div>
          );
        })}
      </div>

      <button
        onClick={prev}
        aria-label="Previous story"
        className="absolute left-4 top-[250px] -translate-y-1/2 z-30 h-9 w-9 rounded-full border border-[#c2d8d2] bg-background shadow-sm flex items-center justify-center hover:bg-[#c7e4e3]/30 transition-colors"
      >
        <ChevronLeft className="h-4 w-4 text-[#128ca0]" />
      </button>
      <button
        onClick={next}
        aria-label="Next story"
        className="absolute right-4 top-[250px] -translate-y-1/2 z-30 h-9 w-9 rounded-full border border-[#c2d8d2] bg-background shadow-sm flex items-center justify-center hover:bg-[#c7e4e3]/30 transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-[#128ca0]" />
      </button>

      <div className="flex items-center justify-center gap-2 mt-4">
        {stories.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to story ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-5 bg-[#128ca0]' : 'w-1.5 bg-[#c2d8d2] hover:bg-[#84b4cc]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const TEAM_MEMBERS = [
  {
    name: "Joshua Ooi",
    firstName: "Josh",
    role: "Columbia University",
    image: "/headshots/JoshuaOoi-cutout.webp",
    bio: "Hi, I'm Josh! I study Applied Mathematics at Columbia University in New York City. I co-founded Unisphere because I'm deeply passionate about giving the next generation of students the tools and guidance they deserve. I know how overwhelming the admissions process can feel, and I believe no student should have to navigate it alone. Outside of building Unisphere, I'm especially interested in helping students develop standout extracurricular profiles, the kind that tell a real story about who you are.",
  },
  {
    name: "Justin Lee",
    firstName: "Justin",
    role: "Oxford University",
    image: "/headshots/JustinLee-cutout.webp",
    bio: "Hey, I'm Justin! I study Economics and Management at the University of Oxford. My road here wasn't straightforward. I originally applied to Economics at Cambridge and got rejected. I know exactly what that feels like. I took a gap year, reflected deeply, gave it everything I had, and came back stronger. That experience taught me more about the UK admissions process than anything else could have. I'm here to help you navigate UCAS, understand what top UK universities are really looking for, and make sure you don't have to learn the hard way.",
  },
  {
    name: "Gha Yuan Ng",
    firstName: "Gha Yuan",
    role: "Yale University",
    image: "/headshots/GhaYuanNg-cutout.webp",
    bio: "Hi, I'm Gha Yuan! I'm currently at Yale University, and I was admitted to five top universities across the US including Ivy League schools and Stanford. I know the US admissions process inside and out. I'm especially passionate about two things: helping students build meaningful, genuine extracurricular profiles, and crafting essays that truly reflect who they are. My own application essays are available in the Resources section of Unisphere, so feel free to use them as inspiration for your own journey.",
  },
];

function TeamSection() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const handleSelect = (name: string) => {
    setSelectedMember(selectedMember === name ? null : name);
  };

  const selected = TEAM_MEMBERS.find((m) => m.name === selectedMember);

  return (
    <section className="py-10 md:py-14 relative overflow-hidden">
      <div className="max-w-3xl mx-auto text-center mb-8 relative z-10">
        <Badge className="mb-3 bg-[#3e5461]/10 text-[#128ca0] hover:bg-[#3e5461]/20 transition-colors">Our People</Badge>
        <h2 className="text-3xl md:text-4xl font-bold mb-2 text-center">Our Team</h2>
        <p className="text-muted-foreground">The dedicated co-founders behind Unisphere</p>
      </div>

      {/* Default grid view (no one selected) */}
      <div
        className={`relative z-10 transition-all duration-500 ease-out ${
          selectedMember ? "opacity-0 max-h-0 overflow-hidden pointer-events-none" : "opacity-100 max-h-[600px]"
        }`}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 [&>*:nth-child(3)]:col-span-2 [&>*:nth-child(3)]:justify-self-center md:[&>*:nth-child(3)]:col-span-1">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="flex flex-col items-center text-center group cursor-pointer"
              onClick={() => handleSelect(member.name)}
            >
              <div className="relative mb-4 w-48 h-48 md:w-60 md:h-60">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-contain object-bottom drop-shadow-md transition-all duration-300 ease-out group-hover:scale-110"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "drop-shadow(0 8px 24px rgba(0,0,0,0.3))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "drop-shadow(0 4px 12px rgba(0,0,0,0.15))";
                  }}
                />
              </div>
              <h3 className="font-semibold text-xl">{member.name}</h3>
              <p className="text-base text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded view (someone selected) */}
      <div
        className={`relative z-10 transition-all duration-500 ease-out ${
          selectedMember ? "opacity-100 max-h-[800px]" : "opacity-0 max-h-0 overflow-hidden pointer-events-none"
        }`}
      >
        {selected && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
              {/* Photo on the left */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="relative w-52 h-52 md:w-64 md:h-64">
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="w-full h-full object-contain object-bottom transition-all duration-500 ease-out"
                    style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.2))" }}
                  />
                </div>
                <h3 className="font-semibold text-xl mt-3 text-black">{selected.name}</h3>
                <p className="text-sm text-black/70">{selected.role}</p>
              </div>

              {/* Bio on the right */}
              <div className="flex-1 flex flex-col justify-center md:pt-6">
                <p className="text-black leading-relaxed text-[15px]">
                  {selected.bio}
                </p>

                {/* Thumbnails of other members */}
                <div className="mt-8 flex items-center gap-4">
                  {TEAM_MEMBERS.filter((m) => m.name !== selectedMember).map((m) => (
                    <button
                      key={m.name}
                      onClick={() => handleSelect(m.name)}
                      className="group/thumb flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white/80 hover:border-[#128ca0]/40 hover:bg-[#128ca0]/5 transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={m.image}
                          alt={m.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 group-hover/thumb:text-[#128ca0] transition-colors">
                        {m.firstName}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    View all
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
    {/* Gradient background - fixed, behind everything */}
    <InteractiveGridBackground />
    {/* Interactive grid overlay - fixed, on top of content, pointer-events pass through */}
    <InteractiveGridOverlay />
    <div className="with-navbar w-full relative" style={{ zIndex: 1 }}>
    <div className="container max-w-screen-xl mx-auto px-4 md:px-6 w-full relative z-10">

      {/* Stories */}
      <section className="py-10 md:py-14 relative overflow-visible">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-10 left-[15%] w-64 h-64 bg-[#84b4cc]/10 rounded-full blur-3xl opacity-60 animate-pulse" style={{ animationDuration: "11s" }} />
        </div>
        <div className="max-w-3xl mx-auto text-center mb-6 relative z-10">
          <Badge className="mb-3 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 transition-colors">From the Team</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-center">Stories</h2>
          <p className="text-muted-foreground">Updates, insights, and moments from the Unisphere journey</p>
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <StoriesCarousel />
        </div>
      </section>

      {/* How Unisphere Works */}
      <section className="py-10 md:py-14 bg-[#c7e4e3]/20  border border-[#c2d8d2]/30 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-[#84b4cc]/5 to-background/10" />
        <div className="max-w-3xl mx-auto text-center mb-10 relative z-10">
          <Badge className="mb-3 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 transition-colors">Simple Process</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-center">How Unisphere Works</h2>
          <p className="text-muted-foreground">Our platform makes it easy to connect and start learning</p>
        </div>
        <div className="container mx-auto px-4 md:px-6">
          <div className="relative mt-8">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-16 w-16 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-[#128ca0]" />
                  </div>
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-6 w-6 text-white text-xs font-bold bg-[#128ca0]">1</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Find Your Path</h3>
                <p className="text-muted-foreground text-sm">Browse our database of tutors by subject, expertise, and availability.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-16 w-16 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-[#128ca0]" />
                  </div>
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-6 w-6 text-white text-xs font-bold bg-[#128ca0]">2</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Schedule Sessions</h3>
                <p className="text-muted-foreground text-sm">Arrange sessions at times that work for you.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-16 w-16 bg-[#c7e4e4] rounded-full flex items-center justify-center mb-4">
                    <Award className="h-12 w-12 text-[#128ca0]" />
                  </div>
                  <div className="absolute -right-2 -top-2 flex justify-center items-center rounded-full h-6 w-6 text-white text-xs font-bold bg-[#128ca0]">3</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Learn & Succeed</h3>
                <p className="text-muted-foreground text-sm">Meet virtually for personalised learning tailored to your needs.</p>
              </div>
            </div>
            <div className="hidden md:block absolute top-[2rem] left-[17%] right-[17%] h-[1px] bg-[#84b4cc] z-[-1]" />
          </div>
        </div>
      </section>

      {/* Team */}
      <TeamSection />

      {/* Values */}
      <section className="py-10 md:py-14 bg-[#c7e4e3]/20  border border-[#c2d8d2]/30 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-[#84b4cc]/5 to-background/10" />
        <div className="max-w-3xl mx-auto text-center mb-8 relative z-10">
          <Badge className="mb-3 bg-[#4b92a9]/10 text-[#126d94] hover:bg-[#4b92a9]/20 transition-colors">What We Stand For</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-center">Our Core Values</h2>
          <p className="text-muted-foreground">The principles that guide everything we do</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 px-4 md:px-8 relative z-10">
          <Card className="bg-background/80  border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#84b4cc]/30 to-[#c7e4e3]/30 flex items-center justify-center shadow-sm flex-shrink-0">
                <Globe className="h-5 w-5 text-[#128ca0]" />
              </div>
              <CardTitle className="text-base">Educational Excellence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Highest quality admissions support through vetted student mentors, curated resources, and proven strategies for top global universities.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background/80  border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#84b4cc]/30 to-[#c7e4e3]/30 flex items-center justify-center shadow-sm flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-[#128ca0]" />
              </div>
              <CardTitle className="text-base">Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Expert guidance that is affordable and within reach. We lower barriers of cost and location with flexible, budget-friendly services.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background/80  border-[#c2d8d2]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px]">
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#84b4cc]/30 to-[#c7e4e3]/30 flex items-center justify-center shadow-sm flex-shrink-0">
                <Star className="h-5 w-5 text-[#128ca0]" />
              </div>
              <CardTitle className="text-base">Innovation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Smarter ways to connect students with peer mentors, personalise the admissions journey, and streamline every step.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 md:py-14 relative">
        <div className="bg-gradient-to-br from-[#84b4cc]/10 via-[#c7e4e3]/10 to-[#84b7bd]/10  border border-[#c2d8d2]/30 rounded-2xl p-8 text-center shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#84b4cc]/10 rounded-full blur-3xl opacity-70" />
            <div className="absolute top-0 left-0 w-48 h-48 bg-[#84b7bd]/10 rounded-full blur-3xl opacity-70" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-center">Ready to start your application journey?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Unlock access to our exclusive community of tutors and students
            </p>
            <Button asChild size="lg" className="bg-[#128ca0] hover:bg-[#126d94] shadow-md hover:shadow-lg transition-all hover:translate-y-[-2px]">
              <Link href="/tutors">
                Begin Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
    </div>
    </div>
  );
}
