"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightCircle,
} from "lucide-react";

interface Payment {
  id: string;
  stripe_session_id: string;
  user_id: string;
  user_email: string;
  credits_added: number;
  amount_total: number;
  currency: string;
  processed_at: string;
}

interface Transfer {
  message_id: string;
  student_id: string;
  tutor_id: string;
  student_email: string;
  tutor_email: string;
  amount: number;
  status: string;
  processed_at: string;
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

export default function AdminCreditsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [transfersCount, setTransfersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"purchases" | "transfers">("purchases");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/dashboard?section=credits")
      .then((r) => r.json())
      .then((d) => {
        setPayments(d.payments || []);
        setTransfers(d.transfers || []);
        setPaymentsCount(d.paymentsCount || 0);
        setTransfersCount(d.transfersCount || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Combine into a unified timeline
  const allTransactions = [
    ...payments.map((p) => ({
      type: "purchase" as const,
      date: p.processed_at,
      user: p.user_email,
      credits: p.credits_added,
      amount: p.amount_total,
      currency: p.currency,
      details: `Stripe payment`,
    })),
    ...transfers.map((t) => ({
      type: "transfer" as const,
      date: t.processed_at,
      user: t.student_email,
      credits: t.amount,
      toUser: t.tutor_email,
      status: t.status,
      details: `${t.student_email} -> ${t.tutor_email}`,
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Credit Transactions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {paymentsCount} purchases, {transfersCount} lesson transfers
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("purchases")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "purchases"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Purchases ({paymentsCount})
        </button>
        <button
          onClick={() => setTab("transfers")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "transfers"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Lesson Transfers ({transfersCount})
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : tab === "purchases" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Credits
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Currency
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-gray-400 text-sm"
                    >
                      No purchases yet
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 text-gray-500">
                        {formatDateTime(p.processed_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {p.user_email}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <ArrowUpCircle className="h-3.5 w-3.5" />+
                          {p.credits_added.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {(p.amount_total / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 uppercase text-xs font-medium">
                        {p.currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Student
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Flow
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Tutor
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Credits
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-gray-400 text-sm"
                    >
                      No transfers yet
                    </td>
                  </tr>
                ) : (
                  transfers.map((t, i) => (
                    <tr
                      key={t.message_id || i}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 text-gray-500">
                        {formatDateTime(t.processed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900 font-medium text-sm">
                            {t.student_email}
                          </p>
                          <p className="text-xs text-red-500">
                            -{t.amount.toLocaleString()} credits
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ArrowRightCircle className="h-4 w-4 text-gray-300 mx-auto" />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900 font-medium text-sm">
                            {t.tutor_email}
                          </p>
                          <p className="text-xs text-emerald-500">
                            +{t.amount.toLocaleString()} credits
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {t.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            t.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700"
                              : t.status === "declined"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
