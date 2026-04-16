"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, ExternalLink, Loader2, Search,
  X, Check, AlertCircle, Trophy, BookOpen, GraduationCap,
  Globe, Microscope, Users, Eye, EyeOff,
} from "lucide-react";

type OpportunityType = "essay-competition" | "olympiad" | "scholarship" | "program" | "extracurricular";
type OpportunityTrack = "uk" | "us" | "both";

interface Opportunity {
  id: string;
  name: string;
  organizer: string;
  type: OpportunityType;
  track: OpportunityTrack;
  deadline: string;
  deadline_note: string | null;
  description: string;
  details: string | null;
  external_url: string | null;
  accent: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

const TYPES: { value: OpportunityType; label: string; icon: any; color: string }[] = [
  { value: "essay-competition", label: "Essay Competition", icon: BookOpen, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "olympiad",          label: "Olympiad",          icon: Microscope, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "scholarship",       label: "Scholarship",       icon: GraduationCap, color: "bg-green-50 text-green-700 border-green-200" },
  { value: "program",           label: "Program",           icon: Globe, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "extracurricular",   label: "Extracurricular",   icon: Users, color: "bg-pink-50 text-pink-700 border-pink-200" },
];

const TRACKS = [
  { value: "uk",   label: "UK 🇬🇧" },
  { value: "us",   label: "US 🇺🇸" },
  { value: "both", label: "Both" },
];

const ACCENTS = ["blue","indigo","purple","violet","green","emerald","teal","amber","rose","red"];

function getTypeInfo(type: string) {
  return TYPES.find(t => t.value === type) || TYPES[0];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_FORM = {
  name: "", organizer: "", type: "essay-competition" as OpportunityType,
  track: "both" as OpportunityTrack, deadline: "", deadline_note: "",
  description: "", details: "", external_url: "", accent: "blue", tags: "",
};

export default function AdminOpportunitiesPage() {
  const [items, setItems]             = useState<Opportunity[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [formError, setFormError]     = useState("");
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("all");
  const [filterTrack, setFilterTrack] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData]       = useState(EMPTY_FORM);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/opportunities", { credentials: "include" });
      const data = await res.json();
      setItems(data.opportunities || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setShowForm(false);
  };

  const openEdit = (opp: Opportunity) => {
    setFormData({
      name: opp.name,
      organizer: opp.organizer,
      type: opp.type,
      track: opp.track,
      deadline: opp.deadline,
      deadline_note: opp.deadline_note || "",
      description: opp.description,
      details: opp.details || "",
      external_url: opp.external_url || "",
      accent: opp.accent,
      tags: opp.tags.join(", "),
    });
    setEditingId(opp.id);
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim() || !formData.organizer.trim() || !formData.deadline || !formData.description.trim()) {
      setFormError("Name, organizer, deadline, and description are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        deadline_note: formData.deadline_note || null,
        details: formData.details || null,
        external_url: formData.external_url || null,
      };
      const url = "/api/admin/opportunities";
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...payload } : payload;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      resetForm();
      fetch_();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/opportunities?id=${id}`, { method: "DELETE", credentials: "include" });
    setDeletingId(null);
    fetch_();
  };

  const handleToggle = async (opp: Opportunity) => {
    await fetch("/api/admin/opportunities", {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id: opp.id, is_active: !opp.is_active }),
    });
    fetch_();
  };

  const filtered = items.filter(opp => {
    if (!showInactive && !opp.is_active) return false;
    if (filterType !== "all" && opp.type !== filterType) return false;
    if (filterTrack !== "all" && opp.track !== filterTrack && opp.track !== "both") return false;
    if (search) {
      const q = search.toLowerCase();
      return opp.name.toLowerCase().includes(q) || opp.organizer.toLowerCase().includes(q) || opp.description.toLowerCase().includes(q);
    }
    return true;
  });

  const field = (key: keyof typeof EMPTY_FORM, val: string) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage essay competitions, scholarships, olympiads, and extracurriculars shown to students.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Opportunity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Active", val: items.filter(o => o.is_active).length, color: "text-gray-900" },
          { label: "Essay Comps", val: items.filter(o => o.is_active && o.type === "essay-competition").length, color: "text-purple-600" },
          { label: "Scholarships", val: items.filter(o => o.is_active && o.type === "scholarship").length, color: "text-green-600" },
          { label: "Programs", val: items.filter(o => o.is_active && (o.type === "program" || o.type === "extracurricular")).length, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10">
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10">
          <option value="all">All Tracks</option>
          {TRACKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
          Show inactive
        </label>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Opportunity" : "New Opportunity"}</h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={e => field("name", e.target.value)}
                  placeholder="e.g., John Locke Essay Competition"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Organizer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organizer *</label>
                <input type="text" value={formData.organizer} onChange={e => field("organizer", e.target.value)}
                  placeholder="e.g., John Locke Institute"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select value={formData.type} onChange={e => field("type", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {/* Track */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Track *</label>
                <select value={formData.track} onChange={e => field("track", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  {TRACKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                <input type="date" value={formData.deadline} onChange={e => field("deadline", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Deadline note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Note <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={formData.deadline_note} onChange={e => field("deadline_note", e.target.value)}
                  placeholder="e.g., varies by category"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description * <span className="text-gray-400 font-normal">(shown on card)</span></label>
                <textarea value={formData.description} onChange={e => field("description", e.target.value)}
                  placeholder="One or two sentences shown on the opportunity card..."
                  rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none" />
              </div>
              {/* Details */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Details <span className="text-gray-400 font-normal">(optional - shown in expanded view)</span></label>
                <textarea value={formData.details} onChange={e => field("details", e.target.value)}
                  placeholder="Longer description with eligibility, prizes, tips..."
                  rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none" />
              </div>
              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="url" value={formData.external_url} onChange={e => field("external_url", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input type="text" value={formData.tags} onChange={e => field("tags", e.target.value)}
                  placeholder="e.g., Philosophy, Economics, Year 12"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              {/* Accent color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Colour</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {ACCENTS.map(a => (
                    <button key={a} type="button" onClick={() => field("accent", a)}
                      className={`w-6 h-6 rounded-full border-2 transition-all bg-${a}-400 ${formData.accent === a ? "border-gray-800 scale-110" : "border-transparent"}`}
                      title={a} />
                  ))}
                </div>
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? "Save Changes" : "Add Opportunity"}
              </button>
              <button type="button" onClick={resetForm} className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Trophy className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            {items.length === 0 ? 'No opportunities yet. Click "Add Opportunity" to create one.' : "No opportunities match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(opp => {
            const typeInfo = getTypeInfo(opp.type);
            const TypeIcon = typeInfo.icon;
            const trackLabel = TRACKS.find(t => t.value === opp.track)?.label || opp.track;

            return (
              <div key={opp.id}
                className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow ${!opp.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className={`font-semibold text-gray-900 ${!opp.is_active ? "line-through" : ""}`}>{opp.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                        <TypeIcon className="h-3 w-3" />{typeInfo.label}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {trackLabel}
                      </span>
                      {!opp.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{opp.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <span>{opp.organizer}</span>
                      <span>Deadline: {formatDate(opp.deadline)}{opp.deadline_note ? ` (${opp.deadline_note})` : ""}</span>
                      {opp.tags.length > 0 && (
                        <span className="flex gap-1">{opp.tags.slice(0,3).map(tag => (
                          <span key={tag} className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">{tag}</span>
                        ))}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {opp.external_url && (
                      <a href={opp.external_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Open link">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => handleToggle(opp)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title={opp.is_active ? "Deactivate" : "Reactivate"}>
                      {opp.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEdit(opp)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {deletingId === opp.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(opp.id)}
                          className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors" title="Confirm delete">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeletingId(null)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" title="Cancel">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(opp.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
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
