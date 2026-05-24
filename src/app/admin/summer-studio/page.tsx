"use client";

import { useEffect, useState } from "react";
import { Loader2, Sun } from "lucide-react";

/**
 * Admin /summer-studio — every Summer Studio interest-form sign-up.
 *
 * Reads from /api/summer-studio/signups (admin-gated server-side). The
 * public form on /summer-studio writes into the same summer_studio_signups
 * table, so this list is the source of truth for who has signed up.
 */

interface Signup {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  school: string | null;
  notes: string | null;
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

export default function AdminSummerStudioPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/summer-studio/signups")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setSignups(d.signups || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-500" />
          Summer Studio
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading
            ? "Loading…"
            : `${signups.length.toLocaleString()} sign-up${
                signups.length === 1 ? "" : "s"
              } — newest first`}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-sm text-red-500">{error}</div>
        ) : signups.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No Summer Studio sign-ups yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    School
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Notes
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Signed up
                  </th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {s.name}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${s.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {s.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {s.phone || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.school || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs whitespace-pre-wrap break-words">
                      {s.notes || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDateTime(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
