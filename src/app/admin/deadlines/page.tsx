"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  ExternalLink,
  Loader2,
  Search,
  Filter,
  Clock,
  Trophy,
  GraduationCap,
  FileText,
  CalendarDays,
  MoreHorizontal,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  category: string;
  link: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type Category =
  | "deadline"
  | "essay_competition"
  | "scholarship"
  | "application"
  | "event"
  | "other";

const CATEGORIES: { value: Category; label: string; icon: any; color: string }[] = [
  { value: "deadline", label: "Deadline", icon: Clock, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "essay_competition", label: "Essay Competition", icon: FileText, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "scholarship", label: "Scholarship", icon: GraduationCap, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "application", label: "Application", icon: CalendarDays, color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "event", label: "Event", icon: Calendar, color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "bg-gray-50 text-gray-700 border-gray-200" },
];

function getCategoryInfo(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[5];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateForInput(dateStr: string) {
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 16);
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function AdminDeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    category: "deadline" as Category,
    link: "",
  });
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/deadlines", { credentials: "include" });
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
    fetchDeadlines();
  }, [fetchDeadlines]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      due_date: "",
      category: "deadline",
      link: "",
    });
    setEditingId(null);
    setFormError("");
    setShowForm(false);
  };

  const openEditForm = (deadline: Deadline) => {
    setFormData({
      title: deadline.title,
      description: deadline.description || "",
      due_date: formatDateForInput(deadline.due_date),
      category: deadline.category as Category,
      link: deadline.link || "",
    });
    setEditingId(deadline.id);
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }
    if (!formData.due_date) {
      setFormError("Due date is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        due_date: new Date(formData.due_date).toISOString(),
        description: formData.description || null,
        link: formData.link || null,
      };

      if (editingId) {
        // Update
        const res = await fetch("/api/admin/deadlines", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        // Create
        const res = await fetch("/api/admin/deadlines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
      }

      resetForm();
      fetchDeadlines();
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/deadlines?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeletingId(null);
      fetchDeadlines();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggleActive = async (deadline: Deadline) => {
    try {
      const res = await fetch("/api/admin/deadlines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: deadline.id,
          is_active: !deadline.is_active,
        }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      fetchDeadlines();
    } catch (err) {
      console.error("Failed to toggle active:", err);
    }
  };

  // Filter deadlines
  const filtered = deadlines.filter((d) => {
    if (!showInactive && !d.is_active) return false;
    if (filterCategory !== "all" && d.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = deadlines.filter((d) => d.is_active).length;
  const upcomingCount = deadlines.filter(
    (d) => d.is_active && getDaysUntil(d.due_date) >= 0
  ).length;
  const pastCount = deadlines.filter(
    (d) => d.is_active && getDaysUntil(d.due_date) < 0
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Deadlines
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage important dates and deadlines shown to students.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Active
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Upcoming
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {upcomingCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Past Due
          </p>
          <p className="text-2xl font-bold text-red-500 mt-1">{pastCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deadlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show inactive
        </label>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Deadline" : "New Deadline"}
            </h2>
            <button
              onClick={resetForm}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Oxford PPE Essay Competition 2026"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the deadline or competition..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors resize-none"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as Category,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link (optional)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {editingId ? "Save Changes" : "Create Deadline"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deadlines List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            {deadlines.length === 0
              ? "No deadlines yet. Click \"Add New\" to create one."
              : "No deadlines match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((deadline) => {
            const cat = getCategoryInfo(deadline.category);
            const CatIcon = cat.icon;
            const days = getDaysUntil(deadline.due_date);
            const isPast = days < 0;
            const isUrgent = days >= 0 && days <= 7;

            return (
              <div
                key={deadline.id}
                className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow ${
                  !deadline.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3
                        className={`font-semibold text-gray-900 ${
                          !deadline.is_active ? "line-through" : ""
                        }`}
                      >
                        {deadline.title}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}
                      >
                        <CatIcon className="h-3 w-3" />
                        {cat.label}
                      </span>
                      {!deadline.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </div>

                    {deadline.description && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {deadline.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(deadline.due_date)}
                      </span>
                      {deadline.is_active && (
                        <span
                          className={`font-medium ${
                            isPast
                              ? "text-red-500"
                              : isUrgent
                              ? "text-amber-500"
                              : "text-green-600"
                          }`}
                        >
                          {isPast
                            ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`
                            : days === 0
                            ? "Due today"
                            : `${days} day${days !== 1 ? "s" : ""} left`}
                        </span>
                      )}
                      {deadline.link && (
                        <a
                          href={deadline.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Link
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(deadline)}
                      className={`p-2 rounded-lg text-sm transition-colors ${
                        deadline.is_active
                          ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          : "text-green-500 hover:text-green-700 hover:bg-green-50"
                      }`}
                      title={
                        deadline.is_active ? "Deactivate" : "Reactivate"
                      }
                    >
                      {deadline.is_active ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditForm(deadline)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {deletingId === deadline.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(deadline.id)}
                          className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Confirm delete"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(deadline.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
