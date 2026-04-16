"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ActivityData {
  name: string;
  sessions: number;
  sortOrder: number;
  date?: Date;
}

interface DashboardChartProps {
  activityData: ActivityData[];
}

export default function DashboardChart({ activityData }: DashboardChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={activityData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#128ca0" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#84b4cc" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
          strokeOpacity={0.4}
        />
        <XAxis
          dataKey="name"
          axisLine={{ stroke: "var(--border)", strokeOpacity: 0.4 }}
          tick={{ fill: "var(--card-foreground)" }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={{ stroke: "var(--border)", strokeOpacity: 0.4 }}
          tick={{ fill: "var(--card-foreground)" }}
        />
        <Tooltip
          formatter={(value) => [`${value} sessions`, "Sessions"]}
          contentStyle={{
            backgroundColor: "var(--card-foreground)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
          labelFormatter={(label: string, payload: any[]) => {
            if (payload && payload[0]) {
              const item = activityData.find((d) => d.name === label);
              if (item && item.date) {
                return `${label} ${item.date.getFullYear()}`;
              }
            }
            return label;
          }}
        />
        <Bar
          dataKey="sessions"
          fill="url(#barGradient)"
          radius={[4, 4, 0, 0]}
          opacity={0.9}
          animationDuration={1500}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
