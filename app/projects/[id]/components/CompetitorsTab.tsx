"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface BrandSoV {
  brand: { id: number; name: string };
  overall_sov: number;
  overall_mention_rate: number;
  sov_change: number | null;
  by_engine: Record<
    string,
    {
      sov: number;
      mention_rate: number;
    }
  >;
}

const BRAND_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#f97316", "#14b8a6", "#a855f7", "#ef4444",
];

const ENGINES = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "gemini", label: "Gemini" },
  { id: "claude", label: "Claude" },
];

export function CompetitorsTab({ projectId }: { projectId: number }) {
  const [sov, setSov] = useState<BrandSoV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/share-of-voice`)
      .then((r) => r.json())
      .then((d) => {
        setSov(d.sov || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading competitors…</div>;
  }

  if (sov.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        No data yet. Run analysis to see competitor benchmarking.
      </div>
    );
  }

  // Pie chart data
  const pieData = sov.map((b, idx) => ({
    name: b.brand.name,
    value: b.overall_sov,
    color: BRAND_COLORS[idx % BRAND_COLORS.length],
  }));

  // Bar chart data: one entry per engine
  const barData = ENGINES.map((engine) => {
    const entry: Record<string, string | number> = { engine: engine.label };
    for (const b of sov) {
      entry[b.brand.name] = b.by_engine[engine.id]?.mention_rate ?? 0;
    }
    return entry;
  });

  return (
    <div className="space-y-8">
      {/* Pie Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Overall Share of Voice</h3>
        <p className="text-sm text-gray-500 mb-6">
          Proportion of brand mentions across all AI engines in the latest run
        </p>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={false}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}%`, "Share of Voice"]}
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#f9fafb" }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Mention Rate by Engine</h3>
        <p className="text-sm text-gray-500 mb-6">
          How often each brand appears in responses per engine
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="engine"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
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
              formatter={(value) => (
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{value}</span>
              )}
            />
            {sov.map((b, idx) => (
              <Bar
                key={b.brand.id}
                dataKey={b.brand.name}
                fill={BRAND_COLORS[idx % BRAND_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SoV Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Share of Voice Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr className="text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3">Brand</th>
                <th className="text-right px-4 py-3">Overall SoV</th>
                <th className="text-right px-4 py-3">Claude SoV</th>
                <th className="text-right px-4 py-3">ChatGPT SoV</th>
                <th className="text-right px-4 py-3">Gemini SoV</th>
                <th className="text-right px-6 py-3">WoW Change</th>
              </tr>
            </thead>
            <tbody>
              {sov.map((b, idx) => (
                <tr key={b.brand.id} className="border-t border-gray-800">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: BRAND_COLORS[idx % BRAND_COLORS.length] }}
                      />
                      <span className="text-white font-medium">{b.brand.name}</span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-4 text-indigo-300 font-mono font-medium">
                    {b.overall_sov}%
                  </td>
                  <td className="text-right px-4 py-4 text-gray-300 font-mono">
                    {b.by_engine["claude"]?.sov ?? 0}%
                  </td>
                  <td className="text-right px-4 py-4 text-gray-300 font-mono">
                    {b.by_engine["chatgpt"]?.sov ?? 0}%
                  </td>
                  <td className="text-right px-4 py-4 text-gray-300 font-mono">
                    {b.by_engine["gemini"]?.sov ?? 0}%
                  </td>
                  <td className="text-right px-6 py-4">
                    {b.sov_change !== null ? (
                      <span
                        className={`font-mono text-sm font-medium ${
                          b.sov_change > 0
                            ? "text-green-400"
                            : b.sov_change < 0
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        {b.sov_change > 0 ? "+" : ""}
                        {b.sov_change}%
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
