"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { SentimentBadge, getDominantSentiment } from "./SentimentBadge";

interface BrandResult {
  brand: { id: number; name: string };
  overall: {
    mention_rate: number;
    avg_position: number;
    sentiment_breakdown: { positive: number; neutral: number; negative: number };
    total_mentions: number;
  };
  by_engine: Record<string, {
    mention_rate: number;
    avg_position: number;
    sentiment_breakdown: { positive: number; neutral: number; negative: number };
    total_mentions: number;
  }>;
}

interface SovData {
  brand: { id: number; name: string };
  overall_sov: number;
  sov_change: number | null;
}

const BRAND_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#f97316", "#14b8a6", "#a855f7", "#ef4444",
];

export function OverviewTab({
  results,
  sovData = [],
}: {
  results: BrandResult[];
  sovData?: SovData[];
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        No results yet. Run an analysis to see brand visibility data.
      </div>
    );
  }

  const chartData = results
    .map((r) => ({
      name: r.brand.name,
      mention_rate: r.overall.mention_rate,
    }))
    .sort((a, b) => b.mention_rate - a.mention_rate);

  // Build a lookup for SoV by brand id
  const sovMap = new Map(sovData.map((s) => [s.brand.id, s]));

  return (
    <div className="space-y-8">
      {/* Bar Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Brand Visibility (Mention Rate %)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, results.length * 50)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#374151", fontSize: 13 }}
              axisLine={false}
              width={100}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Mention Rate"]}
              contentStyle={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
              }}
              labelStyle={{ color: "#111827" }}
            />
            <Bar dataKey="mention_rate" radius={[0, 4, 4, 0]}>
              {chartData.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={BRAND_COLORS[idx % BRAND_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results
          .sort((a, b) => b.overall.mention_rate - a.overall.mention_rate)
          .map((r, idx) => {
            const dominant = getDominantSentiment(r.overall.sentiment_breakdown);
            const sov = sovMap.get(r.brand.id);
            return (
              <div
                key={r.brand.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          background: BRAND_COLORS[idx % BRAND_COLORS.length],
                        }}
                      />
                      <h4 className="font-semibold text-gray-900">
                        {r.brand.name}
                      </h4>
                    </div>
                  </div>
                  <SentimentBadge sentiment={dominant} />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {r.overall.mention_rate}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Visibility</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">
                      #{r.overall.avg_position > 0 ? r.overall.avg_position.toFixed(1) : "—"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Avg Position</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {sov ? `${sov.overall_sov}%` : "—"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Share of Voice</div>
                    {sov?.sov_change !== null && sov?.sov_change !== undefined && (
                      <div
                        className={`text-xs font-medium mt-0.5 ${
                          sov.sov_change > 0
                            ? "text-green-600"
                            : sov.sov_change < 0
                            ? "text-red-600"
                            : "text-gray-400"
                        }`}
                      >
                        {sov.sov_change > 0 ? "+" : ""}
                        {sov.sov_change}% vs last
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Sentiment</span>
                    <span>
                      {r.overall.sentiment_breakdown.positive}✓{" "}
                      {r.overall.sentiment_breakdown.neutral}–{" "}
                      {r.overall.sentiment_breakdown.negative}✗
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                    {r.overall.total_mentions > 0 && (
                      <>
                        <div
                          className="bg-green-500"
                          style={{
                            width: `${
                              (r.overall.sentiment_breakdown.positive /
                                r.overall.total_mentions) *
                              100
                            }%`,
                          }}
                        />
                        <div
                          className="bg-gray-300"
                          style={{
                            width: `${
                              (r.overall.sentiment_breakdown.neutral /
                                r.overall.total_mentions) *
                              100
                            }%`,
                          }}
                        />
                        <div
                          className="bg-red-400"
                          style={{
                            width: `${
                              (r.overall.sentiment_breakdown.negative /
                                r.overall.total_mentions) *
                              100
                            }%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
