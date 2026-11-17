"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { engines } from "@/lib/engines/registry";

interface BrandResult {
  brand: { id: number; name: string };
  by_engine: Record<
    string,
    {
      mention_rate: number;
      avg_position: number;
      sentiment_breakdown: { positive: number; neutral: number; negative: number };
      total_mentions: number;
    }
  >;
}

const ENGINE_COLORS: Record<string, string> = {
  chatgpt: "#10b981",
  gemini: "#3b82f6",
  claude: "#f59e0b",
};

function MentionRateCell({ value }: { value: number }) {
  const pct = Math.min(100, value);
  const bg =
    pct >= 70
      ? "bg-green-50 text-green-700 border-green-200"
      : pct >= 40
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : pct > 0
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-gray-50 text-gray-400 border-gray-200";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border text-xs font-mono ${bg}`}
    >
      {pct > 0 ? `${pct}%` : "—"}
    </span>
  );
}

export function ByEngineTab({ results }: { results: BrandResult[] }) {
  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        No results yet. Run an analysis first.
      </div>
    );
  }

  // Grouped bar chart data: one entry per brand, bars per engine
  const chartData = results.map((r) => {
    const entry: Record<string, string | number> = { brand: r.brand.name };
    for (const engine of engines) {
      entry[engine.name] = r.by_engine[engine.id]?.mention_rate ?? 0;
    }
    return entry;
  });

  return (
    <div className="space-y-8">
      {/* Grouped Bar Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Mention Rate by Engine (%)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(300, results.length * 60)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              type="category"
              dataKey="brand"
              tick={{ fill: "#374151", fontSize: 12 }}
              axisLine={false}
              width={110}
            />
            <Tooltip
              formatter={(value) => [
                `${value}%`,
              ]}
              contentStyle={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
              }}
              labelStyle={{ color: "#111827" }}
            />
            <Legend
              wrapperStyle={{ color: "#6b7280", paddingTop: 16, fontSize: 13 }}
            />
            {engines.map((engine) => (
              <Bar
                key={engine.id}
                dataKey={engine.name}
                fill={ENGINE_COLORS[engine.id] ?? "#6366f1"}
                radius={[0, 3, 3, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Mention Rate Matrix</h3>
          <p className="text-sm text-gray-500 mt-1">% of queries where brand was mentioned</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Brand
                </th>
                {engines.map((e) => (
                  <th
                    key={e.id}
                    className="px-6 py-3 text-xs font-medium text-center uppercase tracking-wide"
                    style={{ color: ENGINE_COLORS[e.id] ?? "#6366f1" }}
                  >
                    {e.name}
                  </th>
                ))}
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {results
                .sort((a, b) => {
                  const avgA =
                    Object.values(a.by_engine).reduce(
                      (s, v) => s + v.mention_rate,
                      0
                    ) / engines.length;
                  const avgB =
                    Object.values(b.by_engine).reduce(
                      (s, v) => s + v.mention_rate,
                      0
                    ) / engines.length;
                  return avgB - avgA;
                })
                .map((r, idx) => {
                  const avg =
                    engines.reduce(
                      (s, e) => s + (r.by_engine[e.id]?.mention_rate ?? 0),
                      0
                    ) / engines.length;
                  return (
                    <tr
                      key={r.brand.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        idx % 2 === 0 ? "" : "bg-gray-50/50"
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {r.brand.name}
                      </td>
                      {engines.map((e) => (
                        <td key={e.id} className="px-6 py-4 text-center">
                          <MentionRateCell
                            value={r.by_engine[e.id]?.mention_rate ?? 0}
                          />
                        </td>
                      ))}
                      <td className="px-6 py-4 text-center">
                        <MentionRateCell value={Math.round(avg * 10) / 10} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Position Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Avg Position by Engine</h3>
          <p className="text-sm text-gray-500 mt-1">Lower = mentioned earlier (better)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Brand
                </th>
                {engines.map((e) => (
                  <th
                    key={e.id}
                    className="px-6 py-3 text-xs font-medium text-center uppercase tracking-wide"
                    style={{ color: ENGINE_COLORS[e.id] ?? "#6366f1" }}
                  >
                    {e.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr
                  key={r.brand.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    idx % 2 === 0 ? "" : "bg-gray-50/50"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {r.brand.name}
                  </td>
                  {engines.map((e) => {
                    const pos = r.by_engine[e.id]?.avg_position;
                    return (
                      <td key={e.id} className="px-6 py-4 text-center">
                        {pos && pos > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 text-xs font-mono">
                            #{pos.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
