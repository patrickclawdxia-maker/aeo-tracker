"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const BRAND_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
];

interface BrandEntry {
  brand: { id: number; name: string };
  mention_rate: number;
  avg_position: number | null;
  authority_score: number;
}

interface TopicData {
  topic: string;
  category: string;
  query_count: number;
  brands: BrandEntry[];
  top_brand: { id: number; name: string } | null;
  top_score: number;
  opportunity: boolean;
}

interface MapData {
  topics: TopicData[];
  run_id: number;
  brands: Array<{ id: number; name: string }>;
  summary: {
    total_topics: number;
    dominated_topics: number;
    contested_topics: number;
    opportunity_topics: number;
  } | null;
}

interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  topic: string;
  brandName: string;
  brandId: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-lg">
      <p className="text-gray-900 font-semibold">{d.topic}</p>
      <p className="text-gray-600">{d.brandName}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-indigo-600">
          Authority Score: <span className="font-mono">{d.x.toFixed(1)}</span>
        </p>
        <p className="text-violet-600">
          Mention Rate: <span className="font-mono">{d.y.toFixed(1)}%</span>
        </p>
        <p className="text-gray-500">
          Queries: <span className="font-mono">{d.z}</span>
        </p>
      </div>
    </div>
  );
}

function getTopicStatus(topic: TopicData): {
  label: string;
  icon: string;
  color: string;
} {
  if (topic.opportunity) {
    return { label: "Opportunity", icon: "🎯", color: "text-blue-600" };
  }
  if (topic.top_score > 60) {
    return {
      label: `Owned by ${topic.top_brand?.name ?? ""}`,
      icon: "👑",
      color: "text-amber-600",
    };
  }
  return { label: "Contested", icon: "⚔️", color: "text-orange-600" };
}

function sortTopics(topics: TopicData[]): TopicData[] {
  return [...topics].sort((a, b) => {
    // opportunity first, then contested, then dominated
    const scoreA = a.opportunity ? 0 : a.top_score <= 60 ? 1 : 2;
    const scoreB = b.opportunity ? 0 : b.top_score <= 60 ? 1 : 2;
    return scoreA - scoreB;
  });
}

function getCategoryBadge(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("product") || lower.includes("feature")) return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  if (lower.includes("comparison") || lower.includes("vs")) return "bg-amber-50 text-amber-700 border border-amber-200";
  if (lower.includes("problem") || lower.includes("pain")) return "bg-red-50 text-red-700 border border-red-200";
  if (lower.includes("tutorial") || lower.includes("how")) return "bg-green-50 text-green-700 border border-green-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

export function AuthorityMapTab({
  projectId,
  brands,
}: {
  projectId: number;
  brands: Array<{ id: number; name: string }>;
}) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMap = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/authority-map`);
      if (res.ok) {
        const data = await res.json();
        if (data.topics && data.topics.length > 0) {
          setMapData(data);
        } else {
          setMapData(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  async function buildMap() {
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/authority-map`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to build authority map");
      } else {
        setMapData(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBuilding(false);
    }
  }

  // Build scatter data grouped by brand
  function buildScatterData(): Record<number, ScatterPoint[]> {
    if (!mapData) return {};
    const result: Record<number, ScatterPoint[]> = {};
    for (const topic of mapData.topics) {
      for (const brandEntry of topic.brands) {
        const brandId = brandEntry.brand.id;
        if (!result[brandId]) result[brandId] = [];
        result[brandId].push({
          x: brandEntry.authority_score,
          y: brandEntry.mention_rate,
          z: Math.max(1, topic.query_count),
          topic: topic.topic,
          brandName: brandEntry.brand.name,
          brandId,
        });
      }
    }
    return result;
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        Loading authority map…
      </div>
    );
  }

  const scatterByBrand = buildScatterData();
  const allBrands = mapData?.brands ?? brands;
  const summary = mapData?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Topical Authority Map
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            See which topics your brand dominates in AI search vs. where
            competitors win
          </p>
        </div>
        <button
          onClick={buildMap}
          disabled={building}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 flex-shrink-0 text-sm"
        >
          {building ? (
            <>
              <span className="animate-spin">⟳</span>
              Building…
            </>
          ) : (
            <>🗺 Build Map</>
          )}
        </button>
      </div>

      {/* Building progress */}
      {building && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 animate-pulse">
          <p className="text-indigo-700 font-medium">
            🧠 Analyzing queries and computing authority scores…
          </p>
          <div className="mt-3 h-2 bg-indigo-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Topics Tracked",
              value: summary.total_topics,
              color: "text-gray-900",
              bg: "bg-white",
            },
            {
              label: "Dominated",
              value: summary.dominated_topics,
              color: "text-amber-600",
              bg: "bg-white",
            },
            {
              label: "Contested",
              value: summary.contested_topics,
              color: "text-orange-600",
              bg: "bg-white",
            },
            {
              label: "Opportunities",
              value: summary.opportunity_topics,
              color: "text-blue-600",
              bg: "bg-white",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} border border-gray-200 rounded-xl p-4 shadow-sm`}
            >
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!mapData && !building && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-4xl mb-4">🗺</p>
          <p className="text-gray-900 font-semibold text-lg mb-2">
            No authority map yet
          </p>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Click Build Map to analyze your tracked queries and generate your
            topical authority map.
          </p>
          <button
            onClick={buildMap}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            🗺 Build Map
          </button>
        </div>
      )}

      {/* Bubble Chart */}
      {mapData && mapData.topics.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Authority Bubble Map
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Each bubble = brand × topic. Size = query count. Bigger &amp;
            right = stronger authority.
          </p>

          {/* Quadrant chart */}
          <div className="relative">
            {/* Quadrant labels — positioned absolutely */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div
                className="absolute text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded"
                style={{ top: "5%", right: "5%" }}
              >
                👑 Dominating
              </div>
              <div
                className="absolute text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded"
                style={{ top: "5%", left: "12%" }}
              >
                📈 Visible but weak
              </div>
              <div
                className="absolute text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded"
                style={{ bottom: "12%", right: "5%" }}
              >
                💤 Underperforming
              </div>
              <div
                className="absolute text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded"
                style={{ bottom: "12%", left: "12%" }}
              >
                🎯 Opportunity Zone
              </div>
            </div>

            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart
                margin={{ top: 20, right: 30, bottom: 30, left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  opacity={0.8}
                />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 100]}
                  name="Authority Score"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  label={{
                    value: "Authority Score →",
                    position: "insideBottom",
                    offset: -15,
                    fill: "#9ca3af",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 100]}
                  name="Mention Rate %"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  label={{
                    value: "Mention Rate %",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fill: "#9ca3af",
                    fontSize: 12,
                  }}
                />
                <ZAxis type="number" dataKey="z" range={[200, 1200]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      {value}
                    </span>
                  )}
                />
                {/* Quadrant dividers */}
                <ReferenceLine
                  x={50}
                  stroke="#d1d5db"
                  strokeDasharray="6 3"
                  strokeWidth={1}
                />
                <ReferenceLine
                  y={50}
                  stroke="#d1d5db"
                  strokeDasharray="6 3"
                  strokeWidth={1}
                />
                {/* Brand scatters */}
                {allBrands.map((brand, idx) => {
                  const points = scatterByBrand[brand.id] ?? [];
                  if (points.length === 0) return null;
                  return (
                    <Scatter
                      key={brand.id}
                      name={brand.name}
                      data={points}
                      fill={BRAND_COLORS[idx % BRAND_COLORS.length]}
                      fillOpacity={0.75}
                    />
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Topic Cards Grid */}
      {mapData && mapData.topics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Topic Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortTopics(mapData.topics).map((topic) => {
              const status = getTopicStatus(topic);
              return (
                <div
                  key={topic.topic}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all shadow-sm"
                >
                  {/* Topic header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-gray-900 font-semibold text-sm">
                        {topic.topic}
                      </h4>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${getCategoryBadge(topic.category)}`}>
                        {topic.category}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <p className={`text-sm font-medium mb-4 ${status.color}`}>
                    {status.icon} {status.label}
                  </p>

                  {/* Brand authority bars */}
                  <div className="space-y-2">
                    {topic.brands.map((brandEntry, idx) => {
                      const brandIdx = allBrands.findIndex(
                        (b) => b.id === brandEntry.brand.id
                      );
                      const color =
                        BRAND_COLORS[
                          (brandIdx >= 0 ? brandIdx : idx) %
                            BRAND_COLORS.length
                        ];
                      return (
                        <div key={brandEntry.brand.id}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500 truncate max-w-[120px]">
                              {brandEntry.brand.name}
                            </span>
                            <span className="text-gray-700 font-mono ml-2 flex-shrink-0">
                              {brandEntry.authority_score.toFixed(0)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  brandEntry.authority_score
                                )}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Query count */}
                  <p className="text-xs text-gray-400 mt-3">
                    Based on {topic.query_count} quer
                    {topic.query_count !== 1 ? "ies" : "y"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
