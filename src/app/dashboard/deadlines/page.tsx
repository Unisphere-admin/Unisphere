"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  ExternalLink,
  Loader2,
  Clock,
  FileText,
  GraduationCap,
  CalendarDays,
  MoreHorizontal,
  Filter,
  Trophy,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  category: string;
  link: string | null;
  created_at: string;
}

type CategoryInfo = {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
};

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  deadline: {
    label: "Deadline",
    icon: Clock,
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  essay_competition: {
    label: "Essay Competition",
    icon: FileText,
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
  },
  scholarship: {
    label: "Scholarship",
    icon: GraduationCap,
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  application: {
    label: "Application",
    icon: CalendarDays,
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
  },
  event: {
    label: "Event",
    icon: Calendar,
    color: "text-pink-700",
    bgColor: "bg-pink-50 border-pink-200",
  },
  other: {
    label: "Other",
    icon: MoreHorizontal,
    color: "text-gray-700",
    bgColor: "bg-gray-50 border-gray-200",
  },
};

function getCategoryInfo(category: string): CategoryInfo {
  return CATEGORY_MAP[category] || CATEGORY_MAP.other;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  const due = new Date(dateStr);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DeadlinesPage() {
  const { user, loading: authLoading } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchDeadlines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/deadlines", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDeadlines(data.deadlines || []);
    } catch (err) {
      console.error("Failed to fetch deadlines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDeadlines();
    }
  }, [authLoading, user, fetchDeadlines]);

  const filtered =
    filterCategory === "all"
      ? deadlines
      : deadlines.filter((d) => d.category === filterCategory);

  // Group by urgency
  const urgent = filtered.filter((d) => {
    const days = getDaysUntil(d.due_date);
    return days >= 0 && days <= 7;
  });
  const upcoming = filtered.filter((d) => {
    const days = getDaysUntil(d.due_date);
    return days > 7 && days <= 30;
  });
  const later = filtered.filter((d) => {
    const days = getDaysUntil(d.due_date);
    return days > 30;
  });

  const uniqueCategories = Array.from(
    new Set(deadlines.map((d) => d.category))
  );

  if (authLoading) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Upcoming deadlines, essay competitions, scholarships, and important dates.
            </p>
          </div>
          <Link
            href="/resources"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-4 w-4" />
            Browse Opportunities
          </Link>
        </div>

        {/* Filter pills */}
        {uniqueCategories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterCategory === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              All ({deadlines.length})
            </button>
            {uniqueCategories.map((cat) => {
              const info = getCategoryInfo(cat);
              const count = deadlines.filter((d) => d.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filterCategory === cat
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {info.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              {deadlines.length === 0
                ? "No upcoming opportunities at the moment."
                : "No opportunities match this filter."}
            </p>
            <Link
              href="/resources"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Sparkles className="h-4 w-4" />
              Browse Opportunities
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Urgent section */}
            {urgent.length > 0 && (
              <DeadlineSection
                title="This Week"
                accent="text-red-500"
                deadlines={urgent}
              />
            )}

            {/* Upcoming section */}
            {upcoming.length > 0 && (
              <DeadlineSection
                title="This Month"
                accent="text-amber-500"
                deadlines={upcoming}
              />
            )}

            {/* Later section */}
            {later.length > 0 && (
              <DeadlineSection
                title="Coming Up"
                accent="text-green-600"
                deadlines={later}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DeadlineSection({
  title,
  accent,
  deadlines,
}: {
  title: string;
  accent: string;
  deadlines: Deadline[];
}) {
  return (
    <div>
      <h2
        className={`text-xs font-semibold uppercase tracking-wider mb-3 ${accent}`}
      >
        {title}
      </h2>
      <div className="space-y-3">
        {deadlines.map((deadline) => (
          <DeadlineCard key={deadline.id} deadline={deadline} />
        ))}
      </div>
    </div>
  );
}

function DeadlineCard({ deadline }: { deadline: Deadline }) {
  const cat = getCategoryInfo(deadline.category);
  const CatIcon = cat.icon;
  const days = getDaysUntil(deadline.due_date);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">{deadline.title}</h3>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 border ${cat.bgColor} ${cat.color}`}
            >
              <CatIcon className="h-2.5 w-2.5 mr-0.5" />
              {cat.label}
            </Badge>
          </div>

          {deadline.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {deadline.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(deadline.due_date)}
            </span>
            <span
              className={`font-medium ${
                days <= 3
                  ? "text-red-500"
                  : days <= 7
                  ? "text-amber-500"
                  : "text-green-600"
              }`}
            >
              {days === 0
                ? "Due today"
                : days === 1
                ? "Due tomorrow"
                : `${days} days left`}
            </span>
          </div>
        </div>

        {deadline.link && (
          <a
            href={deadline.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#128ca0] hover:text-[#0e6b68] border border-[#128ca0]/20 hover:border-[#128ca0]/40 rounded-lg transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </a>
        )}
      </div>
    </div>
  );
}
