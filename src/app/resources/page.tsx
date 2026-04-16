"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  FileText,
  Download,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  GraduationCap,
  Globe2,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  Trophy,
  Award,
  Users,
  Dumbbell,
  Plus,
  CheckCircle2,
  ExternalLink,
  Microscope,
  Calculator,
  Music,
  Landmark,
  FlaskConical,
  Pen,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResourceItem,
  ResourceFile,
  ResourceFolder,
  getResources,
  downloadResource,
  searchResources,
  formatFileSize,
} from "@/lib/db/resources";
import React from "react";
import {
  Opportunity,
  OpportunityType,
  OPPORTUNITY_TYPE_LABELS,
  getAccentClasses,
} from "@/components/dashboard/opportunityData";
import ReactCountryFlag from "react-country-flag";

/* ── Category chip definitions ── */
const CATEGORIES = [
  { id: "all",            label: "All",             icon: Sparkles },
  { id: "uk",             label: "UK",              icon: Globe2 },
  { id: "us",             label: "US",              icon: Globe2 },
  { id: "competitions",   label: "Competitions",    icon: Trophy },
  { id: "scholarships",   label: "Scholarships",    icon: Award },
  { id: "extracurriculars", label: "Extracurriculars", icon: Dumbbell },
  { id: "essays",         label: "Essays",          icon: Pen },
  { id: "oxbridge",       label: "Oxbridge",        icon: GraduationCap },
  { id: "ivy-league",     label: "Ivy League",      icon: GraduationCap },
  { id: "interviews",     label: "Interviews",      icon: BookOpen },
] as const;

/* ── Helper: match a resource file/folder to a category ── */
function matchesCategory(resource: ResourceItem, category: string): boolean {
  if (category === "all" || category === "competitions" || category === "scholarships" || category === "extracurriculars") return true;
  const searchStr = `${resource.name} ${resource.path || ""} ${"displayName" in resource ? resource.displayName : ""}`.toLowerCase();
  switch (category) {
    case "uk":
      return searchStr.includes("uk") || searchStr.includes("ucas") || searchStr.includes("a-level") || searchStr.includes("alevel") || searchStr.includes("gcse");
    case "us":
      return searchStr.includes("us") || searchStr.includes("sat") || searchStr.includes("act") || searchStr.includes("common app") || searchStr.includes("commonapp");
    case "oxbridge": {
      const isEssay = searchStr.includes("essay") || searchStr.includes("personal statement");
      const isUK = searchStr.includes("uk") || searchStr.includes("ucas") || searchStr.includes("a-level");
      return searchStr.includes("oxbridge") || searchStr.includes("oxford") || searchStr.includes("cambridge") || (isEssay && isUK);
    }
    case "ivy-league":
    case "ivy league": {
      const isEssay = searchStr.includes("essay") || searchStr.includes("personal statement");
      const isUS = searchStr.includes("us") || searchStr.includes("common app") || searchStr.includes("sat");
      return searchStr.includes("ivy") || searchStr.includes("harvard") || searchStr.includes("yale") || searchStr.includes("princeton") || (isEssay && isUS);
    }
    case "essays":
      return searchStr.includes("essay") || searchStr.includes("personal statement");
    case "interviews":
      return searchStr.includes("interview") || searchStr.includes("mock");
    default:
      return true;
  }
}

/* ── Helper: match an opportunity to a category ── */
function opportunityMatchesCategory(opp: Opportunity, category: string, query: string): boolean {
  const q = query.toLowerCase();
  const matchesSearch = !query || opp.name.toLowerCase().includes(q) || opp.description.toLowerCase().includes(q) || opp.organizer.toLowerCase().includes(q) || opp.tags.some(t => t.includes(q));
  if (!matchesSearch) return false;

  switch (category) {
    case "all": return true;
    case "uk": return opp.track === "uk" || opp.track === "both";
    case "us": return opp.track === "us" || opp.track === "both";
    case "competitions": return opp.type === "essay-competition" || opp.type === "olympiad";
    case "scholarships": return opp.type === "scholarship";
    case "extracurriculars": return opp.type === "extracurricular" || opp.type === "program";
    case "essays": return opp.type === "essay-competition";
    case "oxbridge": return (opp.track === "uk" || opp.track === "both") && (opp.tags.includes("oxford") || opp.tags.includes("cambridge") || opp.tags.includes("oxbridge"));
    case "ivy-league": return (opp.track === "us" || opp.track === "both") && opp.tags.some(t => ["ivy league", "harvard", "yale", "princeton"].includes(t));
    case "interviews": return false; // interviews are file resources only
    default: return true;
  }
}

/* ── Icon for a folder based on its display name ── */
function getFolderIcon(name: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes("essay") || n.includes("personal statement") || n.includes("writing")) return <Pen className="h-5 w-5" />;
  if (n.includes("interview")) return <Users className="h-5 w-5" />;
  if (n.includes("math") || n.includes("maths")) return <Calculator className="h-5 w-5" />;
  if (n.includes("science") || n.includes("biology") || n.includes("chemistry") || n.includes("physics")) return <Microscope className="h-5 w-5" />;
  if (n.includes("music") || n.includes("art")) return <Music className="h-5 w-5" />;
  if (n.includes("history") || n.includes("humanities")) return <Landmark className="h-5 w-5" />;
  if (n.includes("chemistry") || n.includes("lab")) return <FlaskConical className="h-5 w-5" />;
  if (n.includes("uk") || n.includes("ucas") || n.includes("a-level")) return <BookOpen className="h-5 w-5" />;
  if (n.includes("us") || n.includes("sat") || n.includes("act") || n.includes("common app")) return <GraduationCap className="h-5 w-5" />;
  return <BookOpen className="h-5 w-5" />;
}

/* ── Opportunity card ── */
function OpportunityCard({
  opp,
  added,
  onAdd,
}: {
  opp: Opportunity;
  added: boolean;
  onAdd: (opp: Opportunity) => void;
}) {
  const ac = getAccentClasses(opp.accent);
  const [expanded, setExpanded] = useState(false);
  const typeLabel = OPPORTUNITY_TYPE_LABELS[opp.type];

  const formattedDate = opp.deadline
    ? new Date(opp.deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className={`relative rounded-2xl border ${ac.border} bg-white dark:bg-card overflow-hidden flex flex-col transition-shadow hover:shadow-md`}>
      {/* Accent strip */}
      <div className={`h-1 w-full ${ac.strip}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${ac.badge}`}>
            {typeLabel}
          </span>
          {opp.track === "uk" && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <ReactCountryFlag countryCode="GB" svg style={{ width: "1em", height: "0.8em" }} /> UK
            </span>
          )}
          {opp.track === "us" && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <ReactCountryFlag countryCode="US" svg style={{ width: "1em", height: "0.8em" }} /> US
            </span>
          )}
          {opp.track === "both" && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Globe2 className="h-3 w-3" /> UK &amp; US
            </span>
          )}
        </div>

        {/* Title + organizer */}
        <h3 className="font-semibold text-sm leading-snug mb-0.5">{opp.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">{opp.organizer}</p>

        {/* Description */}
        <p className="text-xs text-foreground/80 leading-relaxed mb-3">{opp.description}</p>

        {/* Expanded details */}
        {expanded && opp.details && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 bg-muted/40 rounded-lg px-3 py-2">
            {opp.details}
          </p>
        )}

        {/* Deadline */}
        {formattedDate && (
          <div className={`flex items-center gap-1.5 text-xs ${ac.text} font-medium mb-4`}>
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
            {opp.deadlineNote && <span className="text-muted-foreground font-normal">({opp.deadlineNote})</span>}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onAdd(opp)}
            disabled={added}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              added
                ? "bg-green-100 text-green-700"
                : `${ac.bg} ${ac.text} hover:opacity-80`
            }`}
          >
            {added ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Added to Timeline</>
            ) : (
              <><Plus className="h-3.5 w-3.5" /> Add to Timeline</>
            )}
          </button>

          {opp.details && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              {expanded ? "Less" : "More info"}
            </button>
          )}

          {opp.externalUrl && (
            <a
              href={opp.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════ */
function ResourcesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<{ name: string; path: string }[]>([{ name: "Home", path: "" }]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<ResourceFile | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [addedOpportunities, setAddedOpportunities] = useState<Set<string>>(new Set());
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  /* ── Auth guard — require login only, all paid/free students can access ── */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  /* ── URL path sync ── */
  useEffect(() => {
    const encodedPath = searchParams.get("path") || "";
    const path = decodeURIComponent(encodedPath);
    if (path !== currentPath) {
      setCurrentPath(path);
      if (path === "") {
        setPathHistory([{ name: "Home", path: "" }]);
      } else {
        const segments = path.split("/");
        const history = [{ name: "Home", path: "" }];
        let currentSegmentPath = "";
        for (const seg of segments) {
          if (seg) {
            currentSegmentPath = currentSegmentPath ? `${currentSegmentPath}/${seg}` : seg;
            history.push({
              name: seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              path: currentSegmentPath,
            });
          }
        }
        setPathHistory(history);
      }
      setResources([]);
      setInitialLoad(true);
    }
  }, [searchParams, currentPath]);

  /* ── Fetch resources ── */
  useEffect(() => {
    let cancelled = false;
    const fetchResources = async () => {
      try {
        setError(null);
        setLoading(true);
        const { items, error: fetchError } = await getResources(currentPath);
        if (cancelled) return;
        if (fetchError) throw fetchError;
        setResources(items);
        setInitialLoad(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load resources: ${msg}`);
        toast.error(`Failed to load resources: ${msg}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResources();
    return () => { cancelled = true; };
  }, [currentPath]);

  /* ── Derived: filtered file resources ── */
  const filteredResources = useMemo(() => {
    let list = resources;
    if (searchQuery) list = searchResources(list, searchQuery);
    if (activeCategory !== "all") list = list.filter((r) => matchesCategory(r, activeCategory));
    return list;
  }, [resources, searchQuery, activeCategory]);

  /* ── Fetch opportunities from Supabase ── */
  useEffect(() => {
    fetch("/api/opportunities")
      .then(r => r.json())
      .then(data => setOpportunities(data.opportunities || []))
      .catch(() => {});
  }, []);

  /* ── Derived: filtered opportunities ── */
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => opportunityMatchesCategory(opp, activeCategory, searchQuery));
  }, [opportunities, searchQuery, activeCategory]);

  /* ── Navigation helpers ── */
  const navigateToFolder = (folderPath: string) => {
    setShowDisclaimer(false);
    router.push(`/resources?path=${encodeURIComponent(folderPath)}`);
  };
  const navigateToBreadcrumb = (path: string) => {
    setShowDisclaimer(false);
    router.push(path ? `/resources?path=${encodeURIComponent(path)}` : "/resources");
  };

  /* ── Download helpers ── */
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      setDownloading(filePath);
      const data = await downloadResource(filePath);
      if (!data) throw new Error("Failed to download file");
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${fileName}`);
    } catch {
      toast.error("Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  const initiateDownload = (file: ResourceFile) => {
    setDownloadingFile(file);
    setDisclaimerAccepted(false);
    setShowDisclaimer(true);
  };

  const handleDisclaimerAccept = () => {
    if (!disclaimerAccepted || !downloadingFile) return;
    setShowDisclaimer(false);
    handleDownload(downloadingFile.path, downloadingFile.displayName);
    setDownloadingFile(null);
  };

  /* ── Add opportunity to timeline ── */
  const handleAddToTimeline = (opp: Opportunity) => {
    const item = {
      title: opp.name,
      date: opp.deadline,
      description: `${opp.organizer} - ${opp.description}`,
      category: "deadline" as const,
      track: opp.track === "both" ? "uk" : opp.track as "uk" | "us",
      group: "Opportunities & Projects",
    };
    try {
      localStorage.setItem("unisphere_pending_timeline_item", JSON.stringify(item));
    } catch {}
    setAddedOpportunities(prev => { const next = new Set(prev); next.add(opp.id); return next; });
    toast.success("Opening your timeline to add this opportunity...");
    setTimeout(() => router.push("/dashboard/timeline"), 800);
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* ── Search bar ── */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources and opportunities..."
          className="pl-10 pr-9 h-11 rounded-full border-muted-foreground/20 bg-muted/30 focus-visible:bg-background transition-colors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Category chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════
          HOME PAGE CONTENT (no folder selected)
          ════════════════════════════════════════ */}
      {currentPath === "" && (
        <>
          {/* ── Opportunities section ── */}
          {filteredOpportunities.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold">Opportunities &amp; Projects</h2>
                <span className="text-xs text-muted-foreground">{filteredOpportunities.length} available</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Real competitions, programmes, and extracurriculars you can join - add any to your timeline to track the deadline.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOpportunities.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    added={addedOpportunities.has(opp.id)}
                    onAdd={handleAddToTimeline}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Timeline promo ── */}
          <div className="mb-10 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-800/40 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20 flex-shrink-0">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">Application Timeline</h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] uppercase tracking-wider font-semibold">Beta</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A personalised, month-by-month roadmap keeping your applications on track. Add opportunities above and they appear automatically as deadlines.
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Personalised deadlines</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Smart reminders</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>UK &amp; US applications</span>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard/timeline")}
                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                  >
                    Go to Timeline
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Study Materials heading ── */}
          {(activeCategory === "all" || activeCategory === "essays" || activeCategory === "interviews" || activeCategory === "uk" || activeCategory === "us" || activeCategory === "oxbridge" || activeCategory === "ivy-league") && (
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Study Materials</h2>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════
          INSIDE A FOLDER - breadcrumb + back
          ════════════════════════════════════════ */}
      {currentPath && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto pb-1">
            {pathHistory.map((item, idx) => (
              <React.Fragment key={item.path}>
                <button
                  onClick={() => navigateToBreadcrumb(item.path)}
                  className={`whitespace-nowrap hover:text-foreground transition-colors ${idx === pathHistory.length - 1 ? "text-foreground font-medium" : ""}`}
                >
                  {item.name}
                </button>
                {idx < pathHistory.length - 1 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const parts = currentPath.split("/");
              parts.pop();
              navigateToBreadcrumb(parts.join("/"));
            }}
            className="text-muted-foreground flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-6 text-sm">
          <p>{error}</p>
        </div>
      )}

      {/* ── File/Folder grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 space-y-3 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filteredResources.length === 0 && currentPath !== "" ? (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Nothing here yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery ? "Try a different search term" : "This folder is empty"}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigateToBreadcrumb("")}>
            Back to Home
          </Button>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredResources.map((resource) => {
            if ("isFolder" in resource) {
              return (
                <button
                  key={resource.id}
                  onClick={() => navigateToFolder(resource.path)}
                  className="group text-left rounded-2xl border bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                    {getFolderIcon(resource.displayName)}
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {resource.displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    Browse <ChevronRight className="h-3 w-3" />
                  </p>
                </button>
              );
            } else {
              return (
                <button
                  key={resource.id}
                  onClick={() => initiateDownload(resource)}
                  className="group text-left rounded-2xl border bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                    {resource.displayName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatFileSize(resource.size)}</span>
                    {resource.category && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {resource.category}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-3 w-3" />
                    Download
                  </div>
                </button>
              );
            }
          })}
        </div>
      ) : null}

      {/* ── Empty state when on home with no files and no opps ── */}
      {!loading && currentPath === "" && filteredResources.length === 0 && filteredOpportunities.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground">Try a different search term or category</p>
        </div>
      )}

      {/* ── Download Disclaimer Dialog ── */}
      <Dialog
        open={showDisclaimer}
        onOpenChange={(open) => {
          if (!open) {
            setShowDisclaimer(false);
            setDownloadingFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-center">Download Agreement</DialogTitle>
            <DialogDescription className="text-center">
              Please read and accept the following terms before downloading this resource.
            </DialogDescription>
          </DialogHeader>

          {downloadingFile && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="overflow-hidden">
                <p className="font-medium text-sm line-clamp-1">{downloadingFile.displayName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(downloadingFile.size)}</p>
              </div>
            </div>
          )}

          <div className="py-3 sm:py-4">
            <div className="bg-muted/50 p-3 sm:p-4 rounded-xl text-sm mb-4">
              <p className="font-medium mb-2">By downloading this resource, you agree to:</p>
              <ul className="list-disc pl-4 sm:pl-5 space-y-1">
                <li>Use this material for personal educational purposes only</li>
                <li>Not distribute, share, or publish this content</li>
                <li>Not upload this content to other platforms</li>
                <li>Not use this content for commercial purposes</li>
              </ul>
            </div>

            <div className="flex items-start space-x-2 sm:space-x-3">
              <Checkbox
                id="disclaimer-checkbox"
                checked={disclaimerAccepted}
                onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="disclaimer-checkbox"
                className="text-sm font-medium leading-tight cursor-pointer"
              >
                I agree not to distribute or share this content with others
              </label>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDisclaimer(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleDisclaimerAccept} disabled={!disclaimerAccepted} className="w-full sm:w-auto">
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={null}>
      <ResourcesContent />
    </Suspense>
  );
}

