"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";

interface UserProfile {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  country?: string;
  countries_to_apply?: string | null;
  application_cycle?: string | null;
}

interface UserData {
  id: string;
  email: string;
  tokens: number;
  has_access: boolean;
  is_tutor: boolean;
  created_at: string;
  last_sign_in: string | null;
  profile: UserProfile | null;
  hasPurchased?: boolean;
}

interface Filters {
  admissionYears: string[];
  destinations: string[];
  hasCredits: boolean | null;   // true = has credits, false = zero credits, null = any
  hasPurchased: boolean | null; // true = ever purchased, false = never purchased, null = any
  role: "all" | "student" | "tutor";
  isPremium: boolean | null;
}

const DEFAULT_FILTERS: Filters = {
  admissionYears: [],
  destinations: [],
  hasCredits: null,
  hasPurchased: null,
  role: "all",
  isPremium: null,
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TogglePill({
  label,
  active,
  onClick,
  color = "blue",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan";
}) {
  const colorMap = {
    blue: active
      ? "bg-blue-600 text-white border-blue-600"
      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600",
    emerald: active
      ? "bg-emerald-600 text-white border-emerald-600"
      : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600",
    violet: active
      ? "bg-violet-600 text-white border-violet-600"
      : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600",
    amber: active
      ? "bg-amber-500 text-white border-amber-500"
      : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600",
    rose: active
      ? "bg-rose-600 text-white border-rose-600"
      : "bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-600",
    cyan: active
      ? "bg-cyan-600 text-white border-cyan-600"
      : "bg-white text-gray-600 border-gray-200 hover:border-cyan-300 hover:text-cyan-600",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${colorMap[color]}`}
    >
      {label}
    </button>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-1.5">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.admissionYears.length > 0) count++;
  if (filters.destinations.length > 0) count++;
  if (filters.hasCredits !== null) count++;
  if (filters.hasPurchased !== null) count++;
  if (filters.role !== "all") count++;
  if (filters.isPremium !== null) count++;
  return count;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
  const limit = 30;

  // Load filter options on mount
  useEffect(() => {
    fetch("/api/admin/dashboard?section=users-meta")
      .then((r) => r.json())
      .then((d) => {
        setAvailableYears(d.admissionYears || []);
        setAvailableDestinations(d.destinations || []);
      })
      .catch(console.error);
  }, []);

  // Load users whenever page, search, or filters change
  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      section: "users",
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.set("search", search);

    // Add filter params
    filters.admissionYears.forEach((y) => params.append("admissionYear", y));
    filters.destinations.forEach((d) => params.append("destination", d));
    if (filters.hasCredits !== null) params.set("hasCredits", String(filters.hasCredits));
    if (filters.hasPurchased !== null) params.set("hasPurchased", String(filters.hasPurchased));
    if (filters.role !== "all") params.set("role", filters.role);
    if (filters.isPremium !== null) params.set("isPremium", String(filters.isPremium));

    fetch(`/api/admin/dashboard?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, filters, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / limit);
  const activeFilterCount = countActiveFilters(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  function toggleYear(year: string) {
    setPage(1);
    setFilters((f) => ({
      ...f,
      admissionYears: f.admissionYears.includes(year)
        ? f.admissionYears.filter((y) => y !== year)
        : [...f.admissionYears, year],
    }));
  }

  function toggleDestination(dest: string) {
    setPage(1);
    setFilters((f) => ({
      ...f,
      destinations: f.destinations.includes(dest)
        ? f.destinations.filter((d) => d !== dest)
        : [...f.destinations, dest],
    }));
  }

  function toggleHasCredits(val: boolean) {
    setPage(1);
    setFilters((f) => ({ ...f, hasCredits: f.hasCredits === val ? null : val }));
  }

  function toggleHasPurchased(val: boolean) {
    setPage(1);
    setFilters((f) => ({ ...f, hasPurchased: f.hasPurchased === val ? null : val }));
  }

  function toggleRole(role: "student" | "tutor") {
    setPage(1);
    setFilters((f) => ({ ...f, role: f.role === role ? "all" : role }));
  }

  function togglePremium() {
    setPage(1);
    setFilters((f) => ({ ...f, isPremium: f.isPremium === true ? null : true }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(DEFAULT_FILTERS);
  }

  function getDisplayName(u: UserData): string {
    if (u.profile?.first_name || u.profile?.last_name) {
      return `${u.profile.first_name || ""} ${u.profile.last_name || ""}`.trim();
    }
    return "";
  }

  function getDestinationLabel(dest: string | null | undefined): string {
    if (!dest) return "";
    const d = dest.toUpperCase();
    if (d.includes("BOTH")) return "UK + US";
    if (d.includes("UK")) return "UK";
    if (d.includes("US")) return "US";
    return dest;
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total.toLocaleString()} {activeFilterCount > 0 ? "matching" : "total"} users
        </p>
      </div>

      {/* Filters panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Role */}
        <FilterSection label="Role">
          <TogglePill
            label="Students"
            active={filters.role === "student"}
            onClick={() => toggleRole("student")}
            color="blue"
          />
          <TogglePill
            label="Tutors"
            active={filters.role === "tutor"}
            onClick={() => toggleRole("tutor")}
            color="violet"
          />
        </FilterSection>

        {/* Admission year */}
        {availableYears.length > 0 && (
          <FilterSection label="Intake Year">
            {availableYears.map((year) => (
              <TogglePill
                key={year}
                label={year}
                active={filters.admissionYears.includes(year)}
                onClick={() => toggleYear(year)}
                color="cyan"
              />
            ))}
          </FilterSection>
        )}

        {/* Destination */}
        {availableDestinations.length > 0 && (
          <FilterSection label="Destination">
            {availableDestinations.map((dest) => (
              <TogglePill
                key={dest}
                label={getDestinationLabel(dest)}
                active={filters.destinations.includes(dest)}
                onClick={() => toggleDestination(dest)}
                color="emerald"
              />
            ))}
          </FilterSection>
        )}

        {/* Credits */}
        <FilterSection label="Credits">
          <TogglePill
            label="Has credits"
            active={filters.hasCredits === true}
            onClick={() => toggleHasCredits(true)}
            color="amber"
          />
          <TogglePill
            label="Zero credits"
            active={filters.hasCredits === false}
            onClick={() => toggleHasCredits(false)}
            color="rose"
          />
        </FilterSection>

        {/* Purchase history */}
        <FilterSection label="Purchases">
          <TogglePill
            label="Has purchased"
            active={filters.hasPurchased === true}
            onClick={() => toggleHasPurchased(true)}
            color="emerald"
          />
          <TogglePill
            label="Never purchased"
            active={filters.hasPurchased === false}
            onClick={() => toggleHasPurchased(false)}
            color="rose"
          />
        </FilterSection>

        {/* Premium */}
        <FilterSection label="Access">
          <TogglePill
            label="Premium only"
            active={filters.isPremium === true}
            onClick={togglePremium}
            color="violet"
          />
        </FilterSection>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Destination
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Intake
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Credits
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Premium
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Signed Up
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-300" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    No users match the current filters
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const displayName = getDisplayName(u);
                  const dest = u.profile?.countries_to_apply;
                  const cycle = u.profile?.application_cycle;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {displayName || u.email}
                          </p>
                          {displayName && (
                            <p className="text-xs text-gray-400">{u.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            u.is_tutor
                              ? "bg-purple-50 text-purple-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {u.is_tutor ? "Tutor" : "Student"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {dest ? (
                          <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {getDestinationLabel(dest)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cycle ? (
                          <span className="text-xs font-mono text-gray-700">
                            {cycle}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono text-sm ${
                            (u.tokens || 0) > 0
                              ? "text-emerald-600 font-semibold"
                              : "text-gray-400"
                          }`}
                        >
                          {(u.tokens || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.has_access ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-200" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {formatDateTime(u.last_sign_in)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages} · {total.toLocaleString()} users
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
