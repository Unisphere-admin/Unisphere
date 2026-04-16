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
import { BarChart as BarChartIcon } from "lucide-react";

interface ActivityData {
  name: string;
  sessions: number;
  date?: Date;
}

export default function ActivityChart({ activityData }: { activityData: ActivityData[] }) {
  if (activityData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <BarChartIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-medium mb-1">No session data</h3>
          <p className="text-muted-foreground text-sm max-w-[240px]">
            Complete your first tutoring session to see monthly activity data
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={activityData}
        margin={{
          top: 10,
          right: 10,
          left: -20,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#128ca0" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#84b4cc" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
        <XAxis
          dataKey="name"
          tickFormatter={(value, index) => {
            const item = activityData[index];
            return item ? item.name : value;
          }}
          axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.4 }}
          tick={{ fill: 'var(--card-foreground)' }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.4 }}
          tick={{ fill: 'var(--card-foreground)' }}
        />
        <Tooltip
          formatter={(value) => [`${value} sessions`, 'Sessions']}
          contentStyle={{
            backgroundColor: 'var(--card-foreground)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
          labelFormatter={(label, payload) => {
            if (payload && payload[0]) {
              const item = activityData.find(d => d.name === label);
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
