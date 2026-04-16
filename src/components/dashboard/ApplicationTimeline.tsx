"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  Clock,
  GraduationCap,
  Flag,
  AlertCircle,
  Target,
  Trash2,
  ExternalLink,
  Search,
  BookOpen,
  FileText,
  Award,
  Zap,
  Flame,
  Pencil,
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GOAL_TEMPLATES, DEADLINE_CATALOG, type GoalTemplate, type DeadlineCatalogItem } from "./timelineData";

/* ================================================================
   TYPES
   ================================================================ */

export interface TimelineGoal {
  id: string;
  name: string;
  track: "uk" | "us";
  icon: string;
  color: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  date: string;
  description?: string;
  completed: boolean;
  category: "deadline" | "milestone" | "reminder";
  track: "uk" | "us";
  goalId?: string;
  goalName?: string;
  actionLink?: string;
  actionLabel?: string;
  isCustom?: boolean;
  addedBy?: string;
}

export interface TimelineMonth {
  month: number;
  year: number;
  label: string;
  items: TimelineItem[];
}


/* ================================================================
   HELPERS
   ================================================================ */
let _idCounter = 0;
const genId = () => `tl-${Date.now()}-${++_idCounter}`;

/** Renders a goal icon from a string name - no emoji, all Lucide / ReactCountryFlag */
const GoalIcon = ({ name, className }: { name: string; className?: string }) => {
  const cls = className || "h-4 w-4";
  switch (name) {
    case "Award":        return <Award className={cls} />;
    case "GraduationCap": return <GraduationCap className={cls} />;
    case "BookOpen":     return <BookOpen className={cls} />;
    case "FlagGB":       return <ReactCountryFlag countryCode="GB" svg style={{ width: "1.1em", height: "0.85em", verticalAlign: "middle" }} />;
    case "Zap":          return <Zap className={cls} />;
    case "Flame":        return <Flame className={cls} />;
    case "FileText":     return <FileText className={cls} />;
    default:             return <Target className={cls} />;
  }
};

/* ================================================================
   COMPONENT
   ================================================================ */

interface ApplicationTimelineProps {
  destination: string;
  universities?: string[];
  isTutor?: boolean;
  studentName?: string;
}

export default function ApplicationTimeline({
  destination,
  universities = [],
  isTutor = false,
  studentName,
}: ApplicationTimelineProps) {
  const hasUK = destination === "UK" || destination === "Both";
  const hasUS = destination === "US" || destination === "Both";

  const [activeTrack, setActiveTrack] = useState<"uk" | "us">(
    hasUK ? "uk" : "us"
  );
  const [enabledTracks, setEnabledTracks] = useState({
    uk: hasUK,
    us: hasUS,
  });

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [goals, setGoals] = useState<TimelineGoal[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // ─── Modal state ───
  const [browseGoalsOpen, setBrowseGoalsOpen] = useState(false);
  const [browseDeadlinesOpen, setBrowseDeadlinesOpen] = useState(false);
  const [addCustomDeadlineOpen, setAddCustomDeadlineOpen] = useState(false);
  const [deadlineSearch, setDeadlineSearch] = useState("");
  const [deadlineGroupFilter, setDeadlineGroupFilter] = useState<string | null>(null);

  // ─── Custom deadline form ───
  const [newDeadlineTitle, setNewDeadlineTitle] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState("");
  const [newDeadlineDesc, setNewDeadlineDesc] = useState("");
  const [newDeadlineCategory, setNewDeadlineCategory] = useState<"deadline" | "milestone" | "reminder">("deadline");

  // ─── Delete confirmation ───
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: "goal" | "item"; id: string; name: string } | null>(null);

  // ─── Pending opportunity from Resources page ───
  // A ref guards against addCatalogDeadline running before it is stable
  const pendingHandledRef = useRef(false);
  useEffect(() => {
    if (pendingHandledRef.current) return;
    try {
      const raw = localStorage.getItem("unisphere_pending_timeline_item");
      if (!raw) return;
      pendingHandledRef.current = true;
      localStorage.removeItem("unisphere_pending_timeline_item");
      const item: DeadlineCatalogItem = JSON.parse(raw);
      // Defer so that state is fully initialised before we mutate it
      setTimeout(() => {
        addCatalogDeadline(item);
      }, 0);
    } catch {}
  // addCatalogDeadline is stable after its own definition - including it would create a circular dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Add track ── */
  const addTrack = (track: "uk" | "us") => {
    if (track === "uk" && !enabledTracks.uk) {
      setEnabledTracks((p) => ({ ...p, uk: true }));
      setActiveTrack("uk");
    } else if (track === "us" && !enabledTracks.us) {
      setEnabledTracks((p) => ({ ...p, us: true }));
      setActiveTrack("us");
    }
  };

  /* ── Goal management ── */
  const isGoalAdded = (key: string) => goals.some((g) => g.id === key);

  const addGoal = (template: GoalTemplate) => {
    if (isGoalAdded(template.key)) return;
    const newGoal: TimelineGoal = {
      id: template.key,
      name: template.name,
      track: template.track,
      icon: template.icon,
      color: template.color,
    };
    const goalItems: TimelineItem[] = template.deadlines.map((d) => ({
      ...d,
      id: genId(),
      goalId: template.key,
      goalName: template.name,
    }));
    setGoals((prev) => [...prev, newGoal]);
    setItems((prev) => [...prev, ...goalItems]);
  };

  const requestRemoveGoal = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    const itemCount = items.filter((i) => i.goalId === goalId).length;
    setPendingDelete({
      type: "goal",
      id: goalId,
      name: goal ? `${goal.icon} ${goal.name} (${itemCount} deadline${itemCount !== 1 ? "s" : ""})` : "this goal",
    });
    setConfirmDeleteOpen(true);
  };

  const removeGoal = (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setItems((prev) => prev.filter((i) => i.goalId !== goalId));
  };

  /* ── Deadline management ── */
  const addCatalogDeadline = (d: DeadlineCatalogItem) => {
    const exists = items.some(
      (i) => i.title === d.title && i.date === d.date && i.track === d.track
    );
    if (exists) return;
    setItems((prev) => [
      ...prev,
      {
        id: genId(),
        title: d.title,
        date: d.date,
        description: d.description,
        completed: false,
        category: d.category,
        track: d.track,
        actionLink: d.actionLink,
        actionLabel: d.actionLabel,
      },
    ]);
  };

  const isDeadlineAdded = (d: DeadlineCatalogItem) =>
    items.some((i) => i.title === d.title && i.date === d.date && i.track === d.track);

  const addCustomDeadline = () => {
    if (!newDeadlineTitle.trim() || !newDeadlineDate) return;
    setItems((prev) => [
      ...prev,
      {
        id: genId(),
        title: newDeadlineTitle.trim(),
        date: newDeadlineDate,
        description: newDeadlineDesc.trim() || undefined,
        completed: false,
        category: newDeadlineCategory,
        track: activeTrack,
        isCustom: true,
        addedBy: isTutor ? "Tutor" : "You",
      },
    ]);
    setAddCustomDeadlineOpen(false);
    setNewDeadlineTitle("");
    setNewDeadlineDate("");
    setNewDeadlineDesc("");
    setNewDeadlineCategory("deadline");
  };

  const requestRemoveItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    setPendingDelete({
      type: "item",
      id: itemId,
      name: item?.title || "this item",
    });
    setConfirmDeleteOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "goal") {
      removeGoal(pendingDelete.id);
    } else {
      removeItem(pendingDelete.id);
    }
    setConfirmDeleteOpen(false);
    setPendingDelete(null);
  };

  const cancelDelete = () => {
    setConfirmDeleteOpen(false);
    setPendingDelete(null);
  };

  const toggleItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i))
    );
  };

  /* ── Filtered catalog ── */
  const filteredCatalog = useMemo(() => {
    let results = DEADLINE_CATALOG.filter((d) => d.track === activeTrack);
    if (deadlineGroupFilter) {
      results = results.filter((d) => d.group === deadlineGroupFilter);
    }
    if (deadlineSearch.trim()) {
      const q = deadlineSearch.toLowerCase();
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.group.toLowerCase().includes(q)
      );
    }
    return results;
  }, [activeTrack, deadlineGroupFilter, deadlineSearch]);

  const catalogGroups = useMemo(() => {
    const groups = new Set(
      DEADLINE_CATALOG.filter((d) => d.track === activeTrack).map((d) => d.group)
    );
    return Array.from(groups);
  }, [activeTrack]);

  /* ── Organise into months (filtered by active track) ── */
  const timeline: TimelineMonth[] = useMemo(() => {
    const filtered = items.filter((i) => i.track === activeTrack);
    const monthMap = new Map<string, TimelineItem[]>();

    filtered.forEach((item) => {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(item);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, monthItems]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          month,
          year,
          label: new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          items: monthItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        };
      });
  }, [items, activeTrack]);

  /* ── Expand logic ── */
  const now = new Date();

  const isExpanded = (m: TimelineMonth) => {
    const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
    if (expandedMonths.has(key)) return true;
    const mDate = new Date(m.year, m.month);
    const diff = (mDate.getFullYear() - now.getFullYear()) * 12 + (mDate.getMonth() - now.getMonth());
    return diff >= 0 && diff <= 1 && !expandedMonths.has(`collapsed-${key}`);
  };

  const handleToggleMonth = (m: TimelineMonth) => {
    const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      const mDate = new Date(m.year, m.month);
      const diff = (mDate.getFullYear() - now.getFullYear()) * 12 + (mDate.getMonth() - now.getMonth());
      const auto = diff >= 0 && diff <= 1;

      if (auto && !next.has(`collapsed-${key}`)) {
        next.add(`collapsed-${key}`);
        next.delete(key);
      } else if (next.has(`collapsed-${key}`)) {
        next.delete(`collapsed-${key}`);
        next.add(key);
      } else if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  /* ── Progress for active track ── */
  const trackItems = items.filter((i) => i.track === activeTrack);
  const completedCount = trackItems.filter((i) => i.completed).length;
  const progressPct = trackItems.length > 0 ? Math.round((completedCount / trackItems.length) * 100) : 0;

  const isPast = (dateStr: string) => new Date(dateStr) < now;

  /* ── Track-specific theming ── */
  const isUK = activeTrack === "uk";
  const trackBarBg = isUK
    ? "bg-gradient-to-b from-orange-400 via-red-500 to-rose-600"
    : "bg-gradient-to-b from-blue-400 via-indigo-500 to-violet-600";
  const trackDotRing = isUK ? "ring-orange-500/30" : "ring-indigo-500/30";
  const trackAccent = isUK ? "text-orange-600 dark:text-orange-400" : "text-indigo-600 dark:text-indigo-400";
  const trackProgressBg = isUK
    ? "bg-gradient-to-r from-orange-500 to-rose-500"
    : "bg-gradient-to-r from-blue-500 to-violet-500";

  const categoryIcon = (cat: TimelineItem["category"]) => {
    switch (cat) {
      case "deadline": return "bg-red-500";
      case "milestone": return isUK ? "bg-orange-500" : "bg-indigo-500";
      case "reminder": return "bg-amber-400";
    }
  };

  const categoryBadgeCls = (cat: TimelineItem["category"]) => {
    switch (cat) {
      case "deadline": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40";
      case "milestone": return isUK
        ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/40"
        : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800/40";
      case "reminder": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
    }
  };

  /* ── Active track goals ── */
  const activeGoals = goals.filter((g) => g.track === activeTrack);
  const availableGoalTemplates = GOAL_TEMPLATES.filter(
    (t) => t.track === activeTrack && !isGoalAdded(t.key)
  );

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-6">
      {/* ── Header row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isTutor && studentName
              ? `${studentName}'s Application Timeline`
              : "Application Timeline"}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
              Beta
            </span>
          </h2>
          {trackItems.length > 0 ? (
            <p className="text-sm text-muted-foreground mt-1">
              {progressPct}% complete -- {completedCount}/{trackItems.length} items
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Add goals and deadlines to build your timeline
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Active goal badges */}
          {activeGoals.map((goal) => (
            <Badge
              key={goal.id}
              variant="outline"
              className="gap-1 group cursor-default bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
            >
              <GoalIcon name={goal.icon} className="h-3 w-3" />
              {goal.name}
              <button onClick={() => requestRemoveGoal(goal.id)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setBrowseDeadlinesOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add Deadlines
          </Button>

          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setBrowseGoalsOpen(true)}>
            <Target className="h-3 w-3 mr-1" />
            Add Goals
          </Button>

          {(!enabledTracks.uk || !enabledTracks.us) && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTrack(enabledTracks.uk ? "us" : "uk")}>
              <Plus className="h-3 w-3 mr-1" />
              Add {enabledTracks.uk ? "US" : "UK"} Timeline
            </Button>
          )}
        </div>
      </div>

      {/* ── UK / US Switcher ── */}
      {enabledTracks.uk && enabledTracks.us && (
        <div className="flex rounded-xl bg-muted/50 p-1 gap-1">
          <button
            onClick={() => setActiveTrack("uk")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTrack === "uk"
                ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ReactCountryFlag countryCode="GB" svg style={{ width: "1.25em", height: "1em" }} />
            UK Timeline
          </button>
          <button
            onClick={() => setActiveTrack("us")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTrack === "us"
                ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ReactCountryFlag countryCode="US" svg style={{ width: "1.25em", height: "1em" }} />
            US Timeline
          </button>
        </div>
      )}

      {/* ── Progress bar (only when items exist) ── */}
      {trackItems.length > 0 && (
        <div className="relative w-full h-3 rounded-full bg-muted/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${trackProgressBg}`}
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite",
            }}
          />
        </div>
      )}

      {/* ── Empty state ── */}
      {trackItems.length === 0 && (
        <>
          <div className="text-center py-16 rounded-2xl border-2 border-dashed border-border/60">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${isUK ? "bg-orange-50" : "bg-indigo-50"}`}>
              <Calendar className={`h-8 w-8 ${isUK ? "text-orange-500" : "text-indigo-500"}`} />
            </div>
            <h3 className="text-lg font-semibold mb-2">No deadlines yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Start by adding a goal (like Oxford or Regular Decision) to populate your timeline with key deadlines, or browse individual deadlines to add exactly what you need.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setBrowseGoalsOpen(true)} className={isUK ? "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600" : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"}>
                <Target className="h-4 w-4 mr-2" />
                Browse Goals
              </Button>
              <Button variant="outline" onClick={() => setBrowseDeadlinesOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Browse Deadlines
              </Button>
            </div>
          </div>

          {/* ── Suggested Goals ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Goals</h3>
              <button
                onClick={() => setBrowseGoalsOpen(true)}
                className={`text-xs font-medium transition-colors ${isUK ? "text-orange-600 hover:text-orange-700" : "text-indigo-600 hover:text-indigo-700"}`}
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GOAL_TEMPLATES.filter((t) => t.track === activeTrack).map((template) => (
                <button
                  key={template.key}
                  onClick={() => addGoal(template)}
                  className="text-left rounded-xl border border-border/50 bg-card/60 hover:border-primary/30 hover:shadow-sm p-4 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <GoalIcon name={template.icon} className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{template.name}</span>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className={`h-3.5 w-3.5 ${isUK ? "text-orange-500" : "text-indigo-500"}`} />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{template.description}</p>
                  <span className="text-[10px] text-muted-foreground">{template.deadlines.length} deadlines</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Popular Deadlines ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popular Deadlines</h3>
              <button
                onClick={() => setBrowseDeadlinesOpen(true)}
                className={`text-xs font-medium transition-colors ${isUK ? "text-orange-600 hover:text-orange-700" : "text-indigo-600 hover:text-indigo-700"}`}
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEADLINE_CATALOG.filter((d) => d.track === activeTrack).slice(0, 6).map((d, i) => (
                <button
                  key={i}
                  onClick={() => addCatalogDeadline(d)}
                  className="flex items-start gap-3 text-left rounded-xl border border-border/50 bg-card/60 hover:border-primary/30 hover:shadow-sm p-3 transition-all group"
                >
                  <div
                    className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                      d.category === "deadline"
                        ? "bg-red-500"
                        : d.category === "milestone"
                        ? isUK
                          ? "bg-orange-500"
                          : "bg-indigo-500"
                        : "bg-amber-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight">{d.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <Plus className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1 ${isUK ? "text-orange-500" : "text-indigo-500"}`} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Vertical timeline with thick fiery bar ── */}
      {trackItems.length > 0 && (
        <div className="relative pl-10 sm:pl-12">
          <div
            className={`absolute left-3 sm:left-4 top-0 bottom-0 w-1.5 rounded-full ${trackBarBg}`}
            style={{
              boxShadow: isUK
                ? "0 0 12px rgba(249, 115, 22, 0.3), 0 0 24px rgba(225, 29, 72, 0.15)"
                : "0 0 12px rgba(99, 102, 241, 0.3), 0 0 24px rgba(139, 92, 246, 0.15)",
            }}
          />
          <div
            className="absolute left-3 sm:left-4 top-0 bottom-0 w-1.5 rounded-full opacity-50"
            style={{
              background: isUK
                ? "linear-gradient(180deg, transparent 0%, rgba(251, 146, 60, 0.6) 30%, rgba(225, 29, 72, 0.4) 70%, transparent 100%)"
                : "linear-gradient(180deg, transparent 0%, rgba(129, 140, 248, 0.6) 30%, rgba(139, 92, 246, 0.4) 70%, transparent 100%)",
              backgroundSize: "100% 200%",
              animation: "fireGlow 3s ease-in-out infinite alternate",
            }}
          />

          {timeline.map((m) => {
            const monthKey = `${m.year}-${String(m.month).padStart(2, "0")}`;
            const expanded = isExpanded(m);
            const monthComplete = m.items.every((i) => i.completed);
            const monthDone = m.items.filter((i) => i.completed).length;

            return (
              <div key={monthKey} className="mb-1">
                <button
                  onClick={() => handleToggleMonth(m)}
                  className="flex items-center gap-4 w-full text-left py-3 group"
                >
                  <div
                    className={`absolute left-1 sm:left-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ring-4 transition-all ${
                      monthComplete
                        ? `${isUK ? "bg-orange-500 ring-orange-500/20" : "bg-indigo-500 ring-indigo-500/20"} text-white`
                        : isPast(`${m.year}-${String(m.month + 1).padStart(2, "0")}-01`)
                        ? "bg-muted-foreground/30 ring-muted/50 text-muted-foreground"
                        : `bg-background ${trackDotRing} ${trackAccent} border-2 ${isUK ? "border-orange-400" : "border-indigo-400"}`
                    }`}
                    style={
                      !monthComplete && !isPast(`${m.year}-${String(m.month + 1).padStart(2, "0")}-01`)
                        ? {
                            boxShadow: isUK
                              ? "0 0 8px rgba(249, 115, 22, 0.4)"
                              : "0 0 8px rgba(99, 102, 241, 0.4)",
                          }
                        : {}
                    }
                  >
                    {monthComplete ? (
                      <Check className="h-3 w-3" />
                    ) : expanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-bold text-sm">{m.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {monthDone}/{m.items.length}
                    </span>
                    {m.items.some((i) => isPast(i.date) && !i.completed) && (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 text-[10px] gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-3 pb-5 ml-1">
                    {m.items.map((item) => (
                      <div
                        key={item.id}
                        className={`relative rounded-2xl border p-4 sm:p-5 transition-all group ${
                          item.completed
                            ? "bg-muted/20 border-border/20 opacity-60"
                            : isPast(item.date)
                            ? "bg-red-50/40 border-red-200/50 dark:bg-red-950/10 dark:border-red-800/20"
                            : "bg-card/90 border-border/40 hover:border-primary/20 hover:shadow-md"
                        }`}
                      >
                        <div
                          className={`absolute -left-[29px] sm:-left-[33px] top-6 w-5 sm:w-6 h-[2px] ${
                            item.completed ? "bg-muted-foreground/20" : isUK ? "bg-orange-300/60" : "bg-indigo-300/60"
                          }`}
                        />
                        <div
                          className={`absolute -left-[31px] sm:-left-[35px] top-[21px] w-2 h-2 rounded-full ${categoryIcon(item.category)}`}
                          style={{
                            boxShadow: !item.completed
                              ? item.category === "deadline"
                                ? "0 0 6px rgba(239, 68, 68, 0.5)"
                                : isUK
                                ? "0 0 6px rgba(249, 115, 22, 0.4)"
                                : "0 0 6px rgba(99, 102, 241, 0.4)"
                              : "none",
                          }}
                        />

                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleItem(item.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                              item.completed
                                ? isUK
                                  ? "bg-orange-500 border-orange-500 text-white"
                                  : "bg-indigo-500 border-indigo-500 text-white"
                                : "border-muted-foreground/25 hover:border-primary/50"
                            }`}
                          >
                            {item.completed && <Check className="h-3 w-3" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`font-semibold text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                                {item.title}
                              </span>
                              {isPast(item.date) && !item.completed && (
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 text-[10px] gap-1">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  Overdue
                                </Badge>
                              )}
                              {item.isCustom && item.addedBy && (
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40">
                                  Added by {item.addedBy}
                                </Badge>
                              )}
                            </div>

                            {item.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{item.description}</p>
                            )}

                            {item.actionLink && !item.completed && (
                              <Link
                                href={item.actionLink}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium mb-2.5 transition-colors ${
                                  isUK ? "text-orange-600 hover:text-orange-700" : "text-indigo-600 hover:text-indigo-700"
                                }`}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {item.actionLabel || "Take action"}
                              </Link>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] ${categoryBadgeCls(item.category)}`}>
                                {item.category}
                              </Badge>
                              {item.goalName && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40">
                                  <Target className="h-2.5 w-2.5 mr-0.5" />
                                  {item.goalName}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => requestRemoveItem(item.id)}
                            className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100"
                            title="Remove this deadline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Shimmer + fire glow keyframes ── */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fireGlow {
          0% { background-position: 0% 0%; opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { background-position: 0% 100%; opacity: 0.3; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
         BROWSE GOALS MODAL (big pop-up)
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={browseGoalsOpen} onOpenChange={setBrowseGoalsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Browse Goals
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Goals are your big-picture targets. Adding a goal populates your timeline with all the key deadlines you need to hit.
          </p>

          {/* UK Goals */}
          {enabledTracks.uk && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <ReactCountryFlag countryCode="GB" svg style={{ width: "1.1em", height: "0.85em" }} /> UK Goals
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOAL_TEMPLATES.filter((t) => t.track === "uk").map((t) => {
                  const added = isGoalAdded(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => !added && addGoal(t)}
                      disabled={added}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        added
                          ? "border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800/40 cursor-default"
                          : `border-border hover:${t.colorClasses.border} hover:${t.colorClasses.bg} hover:shadow-sm`
                      }`}
                    >
                      {added && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <GoalIcon name={t.icon} className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</div>
                        <div className="text-[10px] text-muted-foreground/60 mt-1.5">{t.deadlines.length} deadlines</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* US Goals */}
          {enabledTracks.us && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <ReactCountryFlag countryCode="US" svg style={{ width: "1.1em", height: "0.85em" }} /> US Goals
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOAL_TEMPLATES.filter((t) => t.track === "us").map((t) => {
                  const added = isGoalAdded(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => !added && addGoal(t)}
                      disabled={added}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        added
                          ? "border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800/40 cursor-default"
                          : `border-border hover:${t.colorClasses.border} hover:${t.colorClasses.bg} hover:shadow-sm`
                      }`}
                    >
                      {added && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <GoalIcon name={t.icon} className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</div>
                        <div className="text-[10px] text-muted-foreground/60 mt-1.5">{t.deadlines.length} deadlines</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBrowseGoalsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
         BROWSE DEADLINES MODAL (category-first, then deadlines)
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={browseDeadlinesOpen} onOpenChange={(open) => { setBrowseDeadlinesOpen(open); if (!open) { setDeadlineSearch(""); setDeadlineGroupFilter(null); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {deadlineGroupFilter ? (
                <span className="flex items-center gap-2">
                  <button onClick={() => setDeadlineGroupFilter(null)} className="text-muted-foreground hover:text-foreground transition-colors">Browse Deadlines</button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  {deadlineGroupFilter}
                </span>
              ) : (
                "Browse Deadlines"
              )}
            </DialogTitle>
          </DialogHeader>

          {!deadlineGroupFilter ? (
            /* ── Step 1: Choose a category ── */
            <>
              <p className="text-sm text-muted-foreground -mt-2">
                Choose a category to browse {isUK ? "UK" : "US"} deadlines, or create your own.
              </p>
              <div className="flex-1 overflow-y-auto mt-3 min-h-0 max-h-[55vh] pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catalogGroups.map((group) => {
                    const groupDeadlines = DEADLINE_CATALOG.filter((d) => d.track === activeTrack && d.group === group);
                    const addedCount = groupDeadlines.filter((d) => isDeadlineAdded(d)).length;
                    const getGroupIcon = (g: string) => {
                      const cls = "h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0";
                      switch (g) {
                        case "UCAS":                            return <BookOpen className={cls} />;
                        case "Admissions Tests":                return <FileText className={cls} />;
                        case "Results & Offers":                return <Award className={cls} />;
                        case "Personal Statement & References": return <BookOpen className={cls} />;
                        case "Scholarships & Competitions":     return <Award className={cls} />;
                        case "Common App & Applications":       return <FileText className={cls} />;
                        case "Standardised Testing":            return <Target className={cls} />;
                        case "Financial Aid":                   return <GraduationCap className={cls} />;
                        case "Results & Decisions":             return <Check className={cls} />;
                        case "Essays & Recommendations":        return <BookOpen className={cls} />;
                        default:                                return <Target className={cls} />;
                      }
                    };
                    return (
                      <button
                        key={group}
                        onClick={() => setDeadlineGroupFilter(group)}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm ${
                          isUK ? "hover:border-orange-300/60 hover:bg-orange-50/30" : "hover:border-indigo-300/60 hover:bg-indigo-50/30"
                        } border-border`}
                      >
                        {getGroupIcon(group)}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{group}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {groupDeadlines.length} deadline{groupDeadlines.length !== 1 ? "s" : ""}
                            {addedCount > 0 && (
                              <span className="text-green-600 ml-1">({addedCount} added)</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      </button>
                    );
                  })}

                  {/* Create custom deadline card */}
                  <button
                    onClick={() => { setBrowseDeadlinesOpen(false); setAddCustomDeadlineOpen(true); }}
                    className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-border text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Pencil className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">Create Custom Deadline</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Add your own deadline with a custom date and description</div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </button>
                </div>
              </div>
              <DialogFooter className="mt-3">
                <Button variant="outline" onClick={() => setBrowseDeadlinesOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            /* ── Step 2: View deadlines within the selected category ── */
            <>
              <div className="flex items-center gap-3 -mt-2">
                <button
                  onClick={() => setDeadlineGroupFilter(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isUK ? "border-orange-200 text-orange-700 hover:bg-orange-50" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  }`}
                >
                  &larr; All Categories
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search in ${deadlineGroupFilter}...`}
                    value={deadlineSearch}
                    onChange={(e) => setDeadlineSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mt-2 min-h-0 max-h-[50vh] pr-1">
                {filteredCatalog.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No deadlines match your search.</div>
                ) : (
                  filteredCatalog.map((d, i) => {
                    const added = isDeadlineAdded(d);
                    return (
                      <div
                        key={`${d.title}-${d.date}-${i}`}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                          added ? "border-green-200 bg-green-50/30 dark:bg-green-950/10" : "border-border hover:border-primary/20 hover:bg-muted/20"
                        }`}
                      >
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          d.category === "deadline" ? "bg-red-500" : d.category === "milestone" ? (isUK ? "bg-orange-500" : "bg-indigo-500") : "bg-amber-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{d.title}</span>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{d.description}</p>
                          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                            {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <button
                          onClick={() => !added && addCatalogDeadline(d)}
                          disabled={added}
                          className={`flex-shrink-0 mt-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            added
                              ? "bg-green-100 text-green-700 cursor-default"
                              : isUK
                              ? "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                          }`}
                        >
                          {added ? (
                            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Added</span>
                          ) : (
                            <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add</span>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <DialogFooter className="mt-3">
                <Button variant="outline" onClick={() => setBrowseDeadlinesOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
         ADD CUSTOM DEADLINE MODAL
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addCustomDeadlineOpen} onOpenChange={setAddCustomDeadlineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                placeholder="e.g., Submit scholarship application"
                value={newDeadlineTitle}
                onChange={(e) => setNewDeadlineTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <Input
                type="date"
                value={newDeadlineDate}
                onChange={(e) => setNewDeadlineDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
              <Input
                placeholder="Add any helpful details or notes..."
                value={newDeadlineDesc}
                onChange={(e) => setNewDeadlineDesc(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <div className="flex gap-2">
                {(["deadline", "milestone", "reminder"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewDeadlineCategory(cat)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all ${
                      newDeadlineCategory === cat
                        ? cat === "deadline"
                          ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                          : cat === "milestone"
                          ? isUK
                            ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300"
                            : "border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                          : "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                        : "border-border text-muted-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCustomDeadlineOpen(false)}>Cancel</Button>
            <Button onClick={addCustomDeadline} disabled={!newDeadlineTitle.trim() || !newDeadlineDate}>
              Add Deadline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={confirmDeleteOpen} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Are you sure?
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-muted-foreground">
              You are about to remove{" "}
              <span className="font-medium text-foreground">{pendingDelete?.name}</span>
              {pendingDelete?.type === "goal"
                ? ". This will remove the goal and all of its associated deadlines from your timeline."
                : " from your timeline."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              You can always add it back later from the catalog.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelDelete}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Yes, remove it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
