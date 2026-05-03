"use client";

/**
 * StudentDetailPanel — right-side slide-over showing one student's full
 * profile + survey responses + payments + sessions.
 *
 * Self-contained: takes a studentId and an onClose callback, fetches
 * `/api/admin/dashboard?section=student-detail&studentId=...`, renders
 * the loading / error / loaded states.
 *
 * Used from both /admin (Recent signups feed) and /admin/users (table
 * rows). Lives in components/admin/ so a future /admin/sessions or
 * /admin/conversations page can drop it in without copying code.
 */

import { useEffect, useState } from "react";
import {
  Loader2,
  X,
  Mail,
  DollarSign,
  Video,
  ClipboardList,
} from "lucide-react";

interface StudentDetail {
  user: {
    id: string;
    email: string;
    tokens: number;
    has_access: boolean;
    created_at: string;
    last_sign_in: string | null;
  };
  profile: any | null;
  survey: any | null;
  payments: Array<{
    id: string;
    amount_total: number;
    currency: string;
    credits_added: number;
    processed_at: string;
  }>;
  sessions: Array<{
    id: string;
    status: string;
    scheduled_for: string | null;
    name: string | null;
    created_at: string;
    tutor_name: string;
  }>;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StudentDetailPanel({
  studentId,
  onClose,
}: {
  studentId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setDetail(null);
      setError(null);
      return;
    }
    setLoading(true);
    setDetail(null);
    setError(null);
    fetch(`/api/admin/dashboard?section=student-detail&studentId=${studentId}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || json.error) {
          setError(json.error || `Failed (${r.status})`);
          return;
        }
        // Defensive: server should always return a `user`, but if it
        // doesn't, treat as an error rather than letting the body crash.
        if (!json.user) {
          setError("Server returned no user data");
          return;
        }
        setDetail(json as StudentDetail);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (!studentId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-in fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-gray-900">
            User profile
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-gray-900 mb-1">
              Couldn't load this user
            </p>
            <p className="text-xs text-gray-500 break-words">{error}</p>
          </div>
        ) : !detail ? (
          <p className="px-6 py-10 text-sm text-gray-500 text-center">
            No data.
          </p>
        ) : (
          <StudentDetailBody detail={detail} />
        )}
      </aside>
    </>
  );
}

function StudentDetailBody({ detail }: { detail: StudentDetail }) {
  const { user, profile, survey, payments = [], sessions = [] } = detail;
  // Belt-and-braces: if email is somehow missing, still render something
  // sensible instead of crashing on .split().
  const email = user?.email || "—";
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    (email.includes("@") ? email.split("@")[0] : "Unknown user");

  return (
    <div className="px-6 py-5 space-y-6">
      {/* Identity card */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-base font-semibold text-gray-500">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {displayName}
          </h3>
          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {email}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {user?.has_access && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                Premium
              </span>
            )}
            <span className="text-xs text-gray-500">
              {(user?.tokens ?? 0).toLocaleString()} credits
            </span>
            <span className="text-xs text-gray-400">
              · Joined {formatDateTime(user?.created_at ?? null)}
            </span>
          </div>
        </div>
      </div>

      {/* Onboarding answers — merged view of student_profile (current
          signup flow) and survey_responses (legacy /survey route). For new
          users the data lives entirely in student_profile; for older users
          some fields only exist in survey_responses. We always prefer the
          profile value if present, fall back to survey, and finally show "—"
          if neither has it. This means the section is empty only when the
          user hasn't done either flow at all. */}
      {(() => {
        const has = (...vals: any[]) =>
          vals.some((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0));

        // Helper: parse a value that might be a JSON-encoded array string
        // OR an actual array OR null. Used because student_profile stores
        // a few list fields as JSON-encoded strings (legacy of inserting
        // JSON.stringify() at signup time) while survey_responses stores
        // them as actual arrays.
        const parseList = (val: any): string[] | null => {
          if (!val) return null;
          if (Array.isArray(val)) return val.length > 0 ? val : null;
          if (typeof val === "string") {
            try {
              const p = JSON.parse(val);
              if (Array.isArray(p) && p.length > 0) return p;
            } catch { /* not JSON — treat as a single-item list */ }
            return val.trim() ? [val] : null;
          }
          return null;
        };

        // student_profile has two parallel columns for several concepts
        // (universities_to_apply vs universities, countries_to_apply vs
        // destination, school_name vs school, country vs student_country).
        // Different signup flows wrote to different columns over time, so
        // we read the first one that has a value.
        const universities =
          parseList(profile?.universities_to_apply) ||
          parseList(profile?.universities) ||
          parseList(profile?.intended_universities) ||
          parseList(survey?.universities);

        const exams =
          parseList(profile?.planned_admissions_tests) ||
          parseList(profile?.exams);

        const services = parseList(survey?.services);

        const fields = {
          firstName: profile?.first_name ?? null,
          lastName: profile?.last_name ?? null,
          school: profile?.school_name ?? profile?.school ?? survey?.school ?? null,
          country:
            profile?.country ??
            profile?.student_country ??
            survey?.country ??
            null,
          targeting:
            profile?.countries_to_apply ??
            profile?.destination ??
            survey?.region ??
            null,
          cycle: profile?.application_cycle ?? survey?.application_cycle ?? null,
          major: profile?.intended_major ?? survey?.course ?? null,
          bio: profile?.bio ?? null,
        };

        const empty = !has(
          fields.firstName, fields.lastName, fields.school, fields.country,
          fields.targeting, fields.cycle, fields.major, universities,
          exams, services, fields.bio
        );

        return (
          <Section
            icon={ClipboardList}
            title="Onboarding answers"
            emptyText="No onboarding info yet — user hasn't completed signup or the legacy survey."
            empty={empty}
          >
            <DefList>
              <DefItem label="First name" value={fields.firstName} />
              <DefItem label="Last name" value={fields.lastName} />
              <DefItem label="School" value={fields.school} />
              <DefItem label="Country" value={fields.country} />
              <DefItem label="Targeting" value={fields.targeting} />
              <DefItem label="Application cycle" value={fields.cycle} />
              <DefItem label="Intended major / course" value={fields.major} />
              <DefItem
                label="Target universities"
                value={universities && universities.length > 0 ? universities.join(", ") : null}
              />
              <DefItem
                label="Exams"
                value={exams && exams.length > 0 ? exams.join(", ") : null}
              />
              <DefItem
                label="Services wanted"
                value={services && services.length > 0 ? services.join(", ") : null}
              />
              <DefItem label="Bio" value={fields.bio} />
            </DefList>
          </Section>
        );
      })()}

      {/* Payments */}
      <Section
        icon={DollarSign}
        title={`Payments (${payments.length})`}
        emptyText="No payments yet."
        empty={payments.length === 0}
      >
        <ul className="space-y-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between text-sm border border-gray-100 rounded px-3 py-2"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {(p.amount_total / 100).toFixed(2)}{" "}
                  <span className="text-xs text-gray-500 uppercase">
                    {p.currency}
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  +{p.credits_added.toLocaleString()} credits
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {formatDateTime(p.processed_at)}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Sessions */}
      <Section
        icon={Video}
        title={`Sessions (${sessions.length})`}
        emptyText="No tutoring sessions booked yet."
        empty={sessions.length === 0}
      >
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="text-sm border border-gray-100 rounded px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 truncate">
                  {s.name || "Session"}
                </p>
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    s.status === "ended"
                      ? "bg-gray-100 text-gray-600"
                      : s.status === "started"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                with {s.tutor_name} · {formatDateTime(s.scheduled_for || s.created_at)}
              </p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  emptyText,
  empty,
  children,
}: {
  icon: any;
  title: string;
  emptyText: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      {empty ? (
        <p className="text-sm text-gray-400 italic">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}

function DefList({ children }: { children: React.ReactNode }) {
  return <dl className="space-y-1.5">{children}</dl>;
}

function DefItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex text-sm">
      <dt className="w-36 text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-gray-900 break-words">
        {value ? String(value) : <span className="text-gray-300">—</span>}
      </dd>
    </div>
  );
}
