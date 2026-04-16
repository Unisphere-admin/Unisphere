"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, Star } from "lucide-react";

interface ReviewData {
  id: number;
  created_at: string;
  rating: number;
  review: string;
  student_id: string;
  tutor_id: string;
  student: { email: string; name?: string };
  tutor: { email: string; name?: string };
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-100 text-gray-200"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 30;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/dashboard?section=reviews&page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        ).toFixed(1)
      : "0";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total.toLocaleString()} reviews on the platform
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No reviews yet
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reviews.map((r) => (
              <div key={r.id} className="px-5 py-4 hover:bg-gray-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <StarRating rating={r.rating} />
                      <span className="text-xs text-gray-400">
                        {formatDateTime(r.created_at)}
                      </span>
                    </div>
                    {r.review && (
                      <p className="text-sm text-gray-700 leading-relaxed mb-2">
                        "{r.review}"
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        By:{" "}
                        <span className="text-blue-600 font-medium">
                          {r.student.name || r.student.email}
                        </span>
                      </span>
                      <span>
                        For:{" "}
                        <span className="text-purple-600 font-medium">
                          {r.tutor.name || r.tutor.email}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-2xl font-bold text-gray-800">
                      {r.rating}
                    </span>
                    <span className="text-xs text-gray-400">/5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
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
