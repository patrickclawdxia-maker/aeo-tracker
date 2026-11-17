"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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

const ENGINE_COLORS: Record<string, string> = {
  chatgpt: "#10a37f",
  gemini: "#4285f4",
  claude: "#d97706",
};

const SPARKLINE_HEIGHTS = [20, 28, 24, 34, 38, 44, 40, 52];

function formatPct(value: number | null | undefined) {
  return typeof value === "number" ? `${value}%` : "—";
}

function KpiCard({
  icon,
  label,
  value,
  gradient,
  badge,
}: {
  icon: string;
  label: string;
  value: string;
  gradient: string;
  badge: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg text-white ${gradient}`}>
          {icon}
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
          {badge}
        </span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-400">{label}</div>
      <div className="mt-5 flex h-14 items-end gap-1.5">
        {SPARKLINE_HEIGHTS.map((height, idx) => (
          <div
            key={idx}
            className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-100 to-indigo-300"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}

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
  const topMention = [...results].sort((a, b) => b.overall.mention_rate - a.overall.mention_rate)[0];
  const bestPosition = [...results]
    .filter((r) => r.overall.avg_position > 0)
    .sort((a, b) => a.overall.avg_position - b.overall.avg_position)[0];
  const topSov = [...sovData].sort((a, b) => b.overall_sov - a.overall_sov)[0];
  const totalMentions = results.reduce((sum, r) => sum + r.overall.total_mentions, 0);
  const bestSovChange = sovData.reduce<number | null>((best, s) => {
    if (s.sov_change === null || s.sov_change === undefined) return best;
    return best === null ? s.sov_change : Math.max(best, s.sov_change);
  }, null);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="👁️"
          label="Top Brand Mention Rate"
          value={formatPct(topMention?.overall.mention_rate)}
          gradient="kpi-gradient-indigo"
          badge={topMention ? "Leading" : "No data"}
        />
        <KpiCard
          icon="⌖"
          label="Best Avg Position"
          value={bestPosition ? `#${bestPosition.overall.avg_position.toFixed(1)}` : "—"}
          gradient="kpi-gradient-violet"
          badge="Closest to #1"
        />
        <KpiCard
          icon="◆"
          label="Top Share of Voice"
          value={formatPct(topSov?.overall_sov)}
          gradient="kpi-gradient-emerald"
          badge={bestSovChange !== null && bestSovChange > 0 ? `+${bestSovChange}%` : "Steady"}
        />
        <KpiCard
          icon="✦"
          label="Total Mentions"
          value={totalMentions.toLocaleString()}
          gradient="kpi-gradient-amber"
          badge="All brands"
        />
      </div>

      {/* Bar Chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Brand Visibility (Mention Rate %)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, results.length * 50)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
          >
            <defs>
              {chartData.map((_, idx) => (
                <linearGradient key={idx} id={`brandGradient-${idx}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={BRAND_COLORS[idx % BRAND_COLORS.length]} stopOpacity={0.72} />
                  <stop offset="100%" stopColor={BRAND_COLORS[(idx + 1) % BRAND_COLORS.length]} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
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
            <Bar dataKey="mention_rate" radius={[0, 8, 8, 0]} barSize={18}>
              {chartData.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={`url(#brandGradient-${idx})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...results]
          .sort((a, b) => b.overall.mention_rate - a.overall.mention_rate)
          .map((r, idx) => {
            const dominant = getDominantSentiment(r.overall.sentiment_breakdown);
            const sov = sovMap.get(r.brand.id);
            const engineEntries = Object.entries(r.by_engine ?? {});
            return (
              <div
                key={r.brand.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="h-1.5"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS[idx % BRAND_COLORS.length]}, ${BRAND_COLORS[(idx + 1) % BRAND_COLORS.length]})`,
                  }}
                />
                <div className="p-5">
                <div className="mb-3 flex items-start justify-between">
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

                <div className="mt-4 grid grid-cols-3 gap-3">
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

                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Visibility bar</span>
                    <span>{r.overall.mention_rate}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, r.overall.mention_rate)}%`,
                        background: `linear-gradient(90deg, ${BRAND_COLORS[idx % BRAND_COLORS.length]}, ${BRAND_COLORS[(idx + 2) % BRAND_COLORS.length]})`,
                      }}
                    />
                  </div>
                </div>

                {engineEntries.length > 0 && (
                  <div className="mt-5 grid gap-2 rounded-xl bg-gray-50 p-3">
                    {engineEntries.map(([engine, data]) => (
                      <div key={engine} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium capitalize text-gray-600">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ENGINE_COLORS[engine] ?? "#6b7280" }}
                          />
                          {engine}
                        </span>
                        <span className="text-gray-500">
                          {data.mention_rate}% · #{data.avg_position > 0 ? data.avg_position.toFixed(1) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 border-t border-gray-100 pt-4">
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
              </div>
            );
          })}
      </div>
    </div>
  );
}
