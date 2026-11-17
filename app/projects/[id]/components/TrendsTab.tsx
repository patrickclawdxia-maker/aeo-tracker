"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HistoryEntry {
  run_id: number;
  created_at: string;
  mention_rate: number;
  avg_position: number | null;
}

interface BrandHistory {
  brand: { id: number; name: string };
  by_engine: Record<string, HistoryEntry[]>;
  overall: HistoryEntry[];
}

const BRAND_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#f97316", "#14b8a6", "#a855f7", "#ef4444",
];

const ENGINE_OPTIONS = [
  { id: "all", label: "All Engines" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "gemini", label: "Gemini" },
  { id: "claude", label: "Claude" },
];

export function TrendsTab({ projectId }: { projectId: number }) {
  const [history, setHistory] = useState<BrandHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineFilter, setEngineFilter] = useState("all");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/history`)
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading trends…</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        No historical data yet. Run analysis multiple times to see trends.
      </div>
    );
  }

  // Build chart data: array of { date, brand1_rate, brand2_rate, ... }
  const getDataPoints = () => {
    // Collect all unique run_ids and dates
    const runMap = new Map<number, string>();
    for (const bh of history) {
      const entries = engineFilter === "all" ? bh.overall : (bh.by_engine[engineFilter] || []);
      for (const e of entries) {
        if (!runMap.has(e.run_id)) {
          runMap.set(e.run_id, e.created_at);
        }
      }
    }

    const sortedRuns = Array.from(runMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );

    return sortedRuns.map(([runId, createdAt]) => {
      const point: Record<string, string | number> = {
        date: new Date(createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        run_id: runId,
      };

      for (const bh of history) {
        const entries = engineFilter === "all" ? bh.overall : (bh.by_engine[engineFilter] || []);
        const entry = entries.find((e) => e.run_id === runId);
        point[bh.brand.name] = entry ? entry.mention_rate : 0;
      }

      return point;
    });
  };

  const chartData = getDataPoints();
  const hasData = chartData.length > 0;

  return (
    <div className="space-y-6">
      {/* Engine Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Engine:</span>
        <div className="flex gap-2">
          {ENGINE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setEngineFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                engineFilter === opt.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">
          Visibility Trends Over Time
        </h3>
        {!hasData ? (
          <div className="text-center py-8 text-gray-500">
            No data for this engine filter.
          </div>
        ) : chartData.length < 2 ? (
          <div className="text-center py-8 text-gray-500">
            Need at least 2 runs to show a trend. Run analysis again later.
            <div className="mt-4">
              <div className="text-sm text-gray-400">Current data point:</div>
              {chartData.map((pt, i) => (
                <div key={i} className="text-sm text-gray-300 mt-1">
                  {pt.date as string}: {history.map((bh) => `${bh.brand.name}: ${pt[bh.brand.name]}%`).join(", ")}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={{ stroke: "#374151" }}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#f9fafb" }}
              />
              <Legend
                wrapperStyle={{ color: "#9ca3af", fontSize: 12 }}
              />
              {history.map((bh, idx) => (
                <Line
                  key={bh.brand.id}
                  type="monotone"
                  dataKey={bh.brand.name}
                  stroke={BRAND_COLORS[idx % BRAND_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats table */}
      {chartData.length >= 2 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Run History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left pb-3 pr-4">Date</th>
                  {history.map((bh) => (
                    <th key={bh.brand.id} className="text-right pb-3 px-3">
                      {bh.brand.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((pt, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-3 pr-4 text-gray-300">{pt.date as string}</td>
                    {history.map((bh) => (
                      <td key={bh.brand.id} className="text-right py-3 px-3 text-indigo-300 font-mono">
                        {pt[bh.brand.name] as number}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
