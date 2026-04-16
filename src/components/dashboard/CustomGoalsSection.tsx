"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Target, BookOpen, Award, GraduationCap, FileText,
  Zap, Flame, Flag, Star, Pencil, Trash2, Check, ChevronDown,
  ChevronRight, X, Loader2, Calendar, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface GoalItem {
  id: string;
  title: string;
  due_date: string | null;
  description: string | null;
  is_completed: boolean;
  category: "deadline" | "milestone" | "reminder";
  created_at: string;
}

export interface CustomGoal {
  id: string;
  title: string;
  description: string | null;
  track: "uk" | "us" | "both";
  icon: string;
  color: string;
  created_by: string;
  created_by_role: "student" | "tutor";
  created_by_name: string | null;
  created_at: string;
  user_goal_items: GoalItem[];
}

interface Props {
  /** The student whose goals we are viewing/editing */
  studentId: string | null;
  /** Is the current viewer a tutor? */
  isTutor?: boolean;
  /** Current viewer's user ID */
  viewerId: string;
  /** Student display name (shown in tutor view) */
  studentName?: string;
}

/* ------------------------------------------------------------------ */
/*  Icon helpers                                                        */
/* ------------------------------------------------------------------ */

const ICON_OPTIONS = [
  { name: "Target",        Icon: Target },
  { name: "BookOpen",      Icon: BookOpen },
  { name: "Award",         Icon: Award },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "FileText",      Icon: FileText },
  { name: "Zap",           Icon: Zap },
  { name: "Flame",         Icon: Flame },
  { name: "Flag",          Icon: Flag },
  { name: "Star",          Icon: Star },
];

const COLOR_OPTIONS = [
  { name: "blue",    bg: "bg-blue-100",    text: "text-blue-700",    ring: "ring-blue-400" },
  { name: "emerald", bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-400" },
  { name: "violet",  bg: "bg-violet-100",  text: "text-violet-700",  ring: "ring-violet-400" },
  { name: "amber",   bg: "bg-amber-100",   text: "text-amber-700",   ring: "ring-amber-400" },
  { name: "rose",    bg: "bg-rose-100",    text: "text-rose-700",    ring: "ring-rose-400" },
  { name: "cyan",    bg: "bg-cyan-100",    text: "text-cyan-700",    ring: "ring-cyan-400" },
];

function GoalIcon({ name, className }: { name: string; className?: string }) {
  const cls = className || "h-4 w-4";
  const found = ICON_OPTIONS.find((o) => o.name === name);
  if (!found) return <Target className={cls} />;
  return <found.Icon className={cls} />;
}

function colorClasses(color: string) {
  return COLOR_OPTIONS.find((c) => c.name === color) ?? COLOR_OPTIONS[0];
}

function trackLabel(track: string) {
  if (track === "uk") return "UK";
  if (track === "us") return "US";
  return "UK + US";
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function isOverdue(due_date: string | null) {
  if (!due_date) return false;
  return new Date(due_date + "T00:00:00") < new Date(new Date().toDateString());
}

/* ------------------------------------------------------------------ */
/*  Empty goal form defaults                                            */
/* ------------------------------------------------------------------ */

const EMPTY_GOAL_FORM = {
  title: "",
  description: "",
  track: "both" as "uk" | "us" | "both",
  icon: "Target",
  color: "blue",
};

const EMPTY_ITEM_FORM = {
  title: "",
  due_date: "",
  description: "",
  category: "deadline" as "deadline" | "milestone" | "reminder",
};

/* ================================================================== */
/*  Component                                                           */
/* ================================================================== */

export default function CustomGoalsSection({
  studentId,
  isTutor = false,
  viewerId,
  studentName,
}: Props) {
  const [goals, setGoals] = useState<CustomGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  // ── Goal modal ──
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CustomGoal | null>(null);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);
  const [savingGoal, setSavingGoal] = useState(false);

  // ── Item modal ──
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GoalItem | null>(null);
  const [itemGoalId, setItemGoalId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [savingItem, setSavingItem] = useState(false);

  // ── Delete confirmation ──
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                      */
  /* ---------------------------------------------------------------- */

  const loadGoals = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/goals?studentId=${studentId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load goals");
      setGoals(json.goals || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  /* ---------------------------------------------------------------- */
  /*  Goal CRUD                                                         */
  /* ---------------------------------------------------------------- */

  function openNewGoal() {
    setEditingGoal(null);
    setGoalForm(EMPTY_GOAL_FORM);
    setGoalModalOpen(true);
  }

  function openEditGoal(goal: CustomGoal) {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || "",
      track: goal.track,
      icon: goal.icon,
      color: goal.color,
    });
    setGoalModalOpen(true);
  }

  async function saveGoal() {
    if (!goalForm.title.trim()) return;
    setSavingGoal(true);
    try {
      if (editingGoal) {
        const res = await fetch("/api/goals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalId: editingGoal.id, ...goalForm }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setGoals((prev) => prev.map((g) => g.id === editingGoal.id ? { ...g, ...json.goal } : g));
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, ...goalForm }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setGoals((prev) => [json.goal, ...prev]);
        setExpandedGoals((prev) => new Set(Array.from(prev).concat(json.goal.id)));
      }
      setGoalModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingGoal(false);
    }
  }

  async function confirmDeleteGoal() {
    if (!deleteGoalId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/goals?goalId=${deleteGoalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      setGoals((prev) => prev.filter((g) => g.id !== deleteGoalId));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
      setDeleteGoalId(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Item CRUD                                                         */
  /* ---------------------------------------------------------------- */

  function openAddItem(goalId: string) {
    setEditingItem(null);
    setItemGoalId(goalId);
    setItemForm(EMPTY_ITEM_FORM);
    setItemModalOpen(true);
  }

  function openEditItem(item: GoalItem, goalId: string) {
    setEditingItem(item);
    setItemGoalId(goalId);
    setItemForm({
      title: item.title,
      due_date: item.due_date || "",
      description: item.description || "",
      category: item.category,
    });
    setItemModalOpen(true);
  }

  async function saveItem() {
    if (!itemForm.title.trim()) return;
    setSavingItem(true);
    try {
      if (editingItem) {
        const res = await fetch("/api/goals/items", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: editingItem.id, ...itemForm }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setGoals((prev) => prev.map((g) => ({
          ...g,
          user_goal_items: g.user_goal_items.map((i) =>
            i.id === editingItem.id ? json.item : i
          ),
        })));
      } else {
        const res = await fetch("/api/goals/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalId: itemGoalId, ...itemForm }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setGoals((prev) => prev.map((g) => g.id === itemGoalId
          ? { ...g, user_goal_items: [...g.user_goal_items, json.item] }
          : g
        ));
      }
      setItemModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingItem(false);
    }
  }

  async function toggleItemComplete(item: GoalItem, goalId: string) {
    const res = await fetch("/api/goals/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, is_completed: !item.is_completed }),
    });
    if (res.ok) {
      setGoals((prev) => prev.map((g) => g.id === goalId ? {
        ...g,
        user_goal_items: g.user_goal_items.map((i) =>
          i.id === item.id ? { ...i, is_completed: !i.is_completed } : i
        ),
      } : g));
    }
  }

  async function confirmDeleteItem() {
    if (!deleteItemId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/goals/items?itemId=${deleteItemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      setGoals((prev) => prev.map((g) => ({
        ...g,
        user_goal_items: g.user_goal_items.filter((i) => i.id !== deleteItemId),
      })));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
      setDeleteItemId(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                           */
  /* ---------------------------------------------------------------- */

  function toggleGoal(id: string) {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function canEdit(goal: CustomGoal) {
    return goal.created_by === viewerId;
  }

  function goalProgress(goal: CustomGoal) {
    const total = goal.user_goal_items.length;
    const done = goal.user_goal_items.filter((i) => i.is_completed).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  const categoryColors = {
    deadline: "bg-red-50 text-red-700 border-red-200",
    milestone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    reminder: "bg-amber-50 text-amber-700 border-amber-200",
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  // Tutor with no student selected yet
  if (!studentId && isTutor) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Custom Goals</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Create and manage goals for your students</p>
        </div>
        <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-muted/20">
          <Target className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Select a student above</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Choose a student from the selector to view and manage their goals
          </p>
        </div>
      </div>
    );
  }

  if (!studentId) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {isTutor && studentName ? `${studentName}'s Custom Goals` : "Custom Goals"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTutor
              ? "Create and manage goals for this student"
              : "Personal goals set by you or your tutor"}
          </p>
        </div>
        <Button size="sm" onClick={openNewGoal} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Goal
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && goals.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-muted/20">
          <Target className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No custom goals yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {isTutor
              ? "Create a goal to help guide this student's preparation"
              : "Add a goal to track your own milestones alongside the timeline"}
          </p>
          <Button size="sm" variant="outline" onClick={openNewGoal} className="mt-4 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create first goal
          </Button>
        </div>
      )}

      {/* Goal cards */}
      {!loading && goals.map((goal) => {
        const { bg, text, ring } = colorClasses(goal.color);
        const expanded = expandedGoals.has(goal.id);
        const { total, done, pct } = goalProgress(goal);
        const byTutor = goal.created_by_role === "tutor";
        const sortedItems = [...goal.user_goal_items].sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        });

        return (
          <div
            key={goal.id}
            className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm"
          >
            {/* Goal header */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleGoal(goal.id)}
            >
              {/* Icon */}
              <div className={`p-2 rounded-lg ${bg} shrink-0`}>
                <GoalIcon name={goal.icon} className={`h-4 w-4 ${text}`} />
              </div>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">{goal.title}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${bg} ${text} border-current/20`}>
                    {trackLabel(goal.track)}
                  </span>
                  {byTutor && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                      by {goal.created_by_name || "Tutor"}
                    </span>
                  )}
                </div>
                {goal.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{goal.description}</p>
                )}
                {/* Progress */}
                {total > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
                      <div
                        className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {done}/{total} done
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openEditGoal(goal)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit goal"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteGoalId(goal.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Delete goal"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expand chevron */}
              {expanded
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              }
            </div>

            {/* Items */}
            {expanded && (
              <div className="border-t border-border/40">
                {sortedItems.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No items yet. Add a deadline, milestone, or reminder.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/30">
                    {sortedItems.map((item) => {
                      const overdue = isOverdue(item.due_date) && !item.is_completed;
                      return (
                        <li key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleItemComplete(item, goal.id)}
                            className={`mt-0.5 shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                              item.is_completed
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-border hover:border-primary"
                            }`}
                          >
                            {item.is_completed && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {item.due_date && (
                                <span className={`flex items-center gap-1 text-[11px] ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                                  <Calendar className="h-3 w-3" />
                                  {overdue && "Overdue - "}
                                  {formatDate(item.due_date)}
                                </span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[item.category]}`}>
                                {item.category}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                          </div>

                          {/* Item actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => openEditItem(item, goal.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setDeleteItemId(item.id)}
                              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Add item button */}
                <div className="px-4 py-2.5 border-t border-border/30">
                  <button
                    onClick={() => openAddItem(goal.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add deadline / milestone
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ============================================================ */}
      {/* Goal modal (create / edit)                                    */}
      {/* ============================================================ */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "New Custom Goal"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Goal title <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. Oxford Interview Prep"
                value={goalForm.title}
                onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={80}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="Brief description of this goal"
                value={goalForm.description}
                onChange={(e) => setGoalForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={160}
              />
            </div>

            {/* Track */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Track</label>
              <div className="flex gap-2">
                {(["uk", "us", "both"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setGoalForm((f) => ({ ...f, track: t }))}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      goalForm.track === t
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40"
                    }`}
                  >
                    {t === "both" ? "UK + US" : t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon picker */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map(({ name, Icon }) => (
                  <button
                    key={name}
                    onClick={() => setGoalForm((f) => ({ ...f, icon: name }))}
                    className={`p-2 rounded-lg border transition-all ${
                      goalForm.icon === name
                        ? "border-foreground bg-foreground/5 ring-2 ring-foreground/20"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(({ name, bg, ring }) => (
                  <button
                    key={name}
                    onClick={() => setGoalForm((f) => ({ ...f, color: name }))}
                    className={`h-7 w-7 rounded-full ${bg} transition-all ${
                      goalForm.color === name ? `ring-2 ring-offset-2 ${ring}` : ""
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalModalOpen(false)} disabled={savingGoal}>
              Cancel
            </Button>
            <Button onClick={saveGoal} disabled={!goalForm.title.trim() || savingGoal}>
              {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingGoal ? "Save Changes" : "Create Goal")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Item modal (add / edit)                                       */}
      {/* ============================================================ */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. Submit personal statement draft"
                value={itemForm.title}
                onChange={(e) => setItemForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={120}
                autoFocus
              />
            </div>

            {/* Due date */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due date <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <Input
                type="date"
                value={itemForm.due_date}
                onChange={(e) => setItemForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <div className="flex gap-2">
                {(["deadline", "milestone", "reminder"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setItemForm((f) => ({ ...f, category: c }))}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize ${
                      itemForm.category === c
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                placeholder="Add any helpful details or notes..."
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={500}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModalOpen(false)} disabled={savingItem}>
              Cancel
            </Button>
            <Button onClick={saveItem} disabled={!itemForm.title.trim() || savingItem}>
              {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingItem ? "Save Changes" : "Add Item")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Delete goal confirmation                                      */}
      {/* ============================================================ */}
      <Dialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this goal and all its items. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGoalId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGoal} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Delete item confirmation                                      */}
      {/* ============================================================ */}
      <Dialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this item from the goal?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteItem} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
