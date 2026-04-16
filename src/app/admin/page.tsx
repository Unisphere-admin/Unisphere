"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CreditCard,
  Video,
  Star,
  GraduationCap,
  UserCheck,
  Coins,
  DollarSign,
  Loader2,
} from "lucide-react";

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

  useEffect(() => {
    fetch("/api/admin/dashboard?section=overview")
      .then((r) => r.json())
      .then((d) => setData(d.overview))
      .catch(console.error)
      .finally(() => setLoading(false));
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
    </div>
  );
}
