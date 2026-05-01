"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Video,
  Star,
  GraduationCap,
  UserCheck,
  Coins,
  DollarSign,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import dynamic from "next/dynamic";

// StudentDetailPanel only renders when a row is clicked. Loading it
// lazily keeps the initial /admin bundle smaller (the panel pulls in
// its own icon set, format helpers, and the detail-fetch logic).
const StudentDetailPanel = dynamic(
  () => import("@/components/admin/StudentDetailPanel").then((m) => ({
    default: m.StudentDetailPanel,
  })),
  { ssr: false }
);

interface OverviewData {
  totalUsers: number;
  totalStudents: number;
  totalTutors: number;
  premiumUsers: number;
  totalSessions: number;
  totalReviews: number;
  totalCreditsInSystem: number;
  totalCreditsPurchased: number;
  totalRevenueCents: number;
  totalPayments: number;
}

interface RecentSignup {
  id: string;
  email: string;
  created_at: string;
  has_access: boolean;
  survey_completed: boolean;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  school: string | null;
  countries_to_apply: string | null;
  application_cycle: string | null;
  target_unis_preview: string[];
}

function formatRelative(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signups, setSignups] = useState<RecentSignup[] | null>(null);
  const [signupsLoading, setSignupsLoading] = useState(true);

  // ID of the student whose detail panel is open (null when closed).
  // The shared StudentDetailPanel does the actual fetching.
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Fire both fetches in parallel rather than as two unrelated
    // useEffects — same network behaviour, but the relationship is
    // explicit and React batches the resulting state updates.
    let cancelled = false;
    Promise.allSettled([
      fetch("/api/admin/dashboard?section=overview").then((r) => r.json()),
      fetch("/api/admin/dashboard?section=recent-signups&limit=20").then((r) => r.json()),
    ]).then(([overviewRes, signupsRes]) => {
      if (cancelled) return;
      if (overviewRes.status === "fulfilled") setData(overviewRes.value.overview);
      else console.error(overviewRes.reason);
      setLoading(false);

      if (signupsRes.status === "fulfilled") setSignups(signupsRes.value.signups || []);
      else console.error(signupsRes.reason);
      setSignupsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-gray-500 text-center mt-12">
        Failed to load dashboard data.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of Unisphere platform activity
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={data.totalUsers.toLocaleString()}
          icon={Users}
          subtitle={`${data.totalStudents} students, ${data.totalTutors} tutors`}
          color="bg-blue-500"
        />
        <StatCard
          label="Premium Users"
          value={data.premiumUsers.toLocaleString()}
          icon={UserCheck}
          subtitle={`${data.totalUsers > 0 ? Math.round((data.premiumUsers / data.totalUsers) * 100) : 0}% of all users`}
          color="bg-emerald-500"
        />
        <StatCard
          label="Credits in System"
          value={data.totalCreditsInSystem.toLocaleString()}
          icon={Coins}
          subtitle={`${data.totalCreditsPurchased.toLocaleString()} total purchased`}
          color="bg-amber-500"
        />
        <StatCard
          label="Total Revenue"
          value={`$${(data.totalRevenueCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          subtitle={`${data.totalPayments} payments`}
          color="bg-violet-500"
        />
        <StatCard
          label="Students"
          value={data.totalStudents.toLocaleString()}
          icon={GraduationCap}
          color="bg-cyan-500"
        />
        <StatCard
          label="Tutors"
          value={data.totalTutors.toLocaleString()}
          icon={Users}
          color="bg-teal-500"
        />
        <StatCard
          label="Sessions"
          value={data.totalSessions.toLocaleString()}
          icon={Video}
          color="bg-indigo-500"
        />
        <StatCard
          label="Reviews"
          value={data.totalReviews.toLocaleString()}
          icon={Star}
          color="bg-rose-500"
        />
      </div>

      {/* ─── Recent Signups timeline ─────────────────────────────────────
          A live feed of the most recent students to register, sorted
          newest first. Click a row to slide open a panel with the full
          profile + survey responses + payment / session history. */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent signups</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click a student to see their profile and survey answers
            </p>
          </div>
          <a
            href="/admin/users"
            className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
          >
            View all users <ChevronRight className="h-3 w-3" />
          </a>
        </div>

        {signupsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : !signups || signups.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            No signups yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {signups.map((s) => {
              const displayName =
                [s.first_name, s.last_name].filter(Boolean).join(" ") ||
                s.email.split("@")[0];
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedStudentId(s.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {s.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-gray-500">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {displayName}
                        </p>
                        {s.has_access && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Premium
                          </span>
                        )}
                        {s.survey_completed ? (
                          <span
                            title="Survey completed"
                            className="inline-flex items-center text-emerald-600"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span
                            title="Survey not completed"
                            className="inline-flex items-center text-gray-300"
                          >
                            <Circle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {s.email}
                        {s.school && (
                          <>
                            <span className="mx-1.5">·</span>
                            {s.school}
                          </>
                        )}
                        {s.countries_to_apply && (
                          <>
                            <span className="mx-1.5">·</span>
                            Targeting {s.countries_to_apply}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Time + arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {formatRelative(s.created_at)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Student detail slide-over (shared with /admin/users) */}
      <StudentDetailPanel
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />
    </div>
  );
}
