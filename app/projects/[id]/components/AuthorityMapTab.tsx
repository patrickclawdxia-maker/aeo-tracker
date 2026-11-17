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
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm shadow-lg">
      <p className="text-white font-semibold">{d.topic}</p>
      <p className="text-gray-300">{d.brandName}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-indigo-300">
          Authority Score: <span className="font-mono">{d.x.toFixed(1)}</span>
        </p>
        <p className="text-purple-300">
          Mention Rate: <span className="font-mono">{d.y.toFixed(1)}%</span>
        </p>
        <p className="text-gray-400">
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
    return { label: "Opportunity", icon: "🎯", color: "text-blue-400" };
  }
  if (topic.top_score > 60) {
    return {
      label: `Owned by ${topic.top_brand?.name ?? ""}`,
      icon: "👑",
      color: "text-yellow-400",
    };
  }
  return { label: "Contested", icon: "⚔️", color: "text-orange-400" };
}

function sortTopics(topics: TopicData[]): TopicData[] {
  return [...topics].sort((a, b) => {
    // opportunity first, then contested, then dominated
    const scoreA = a.opportunity ? 0 : a.top_score <= 60 ? 1 : 2;
    const scoreB = b.opportunity ? 0 : b.top_score <= 60 ? 1 : 2;
    return scoreA - scoreB;
  });
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
      <div className="text-center py-16 text-gray-500">
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
          <h2 className="text-2xl font-bold text-white">
            Topical Authority Map
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            See which topics your brand dominates in AI search vs. where
            competitors win
          </p>
        </div>
        <button
          onClick={buildMap}
          disabled={building}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 flex-shrink-0"
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
        <div className="bg-indigo-950/50 border border-indigo-800 rounded-xl p-5 animate-pulse">
          <p className="text-indigo-300 font-medium">
            🧠 Analyzing queries and computing authority scores…
          </p>
          <div className="mt-3 h-2 bg-indigo-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
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
              color: "text-white",
              bg: "bg-gray-900",
            },
            {
              label: "Dominated",
              value: summary.dominated_topics,
              color: "text-yellow-400",
              bg: "bg-gray-900",
            },
            {
              label: "Contested",
              value: summary.contested_topics,
              color: "text-orange-400",
              bg: "bg-gray-900",
            },
            {
              label: "Opportunities",
              value: summary.opportunity_topics,
              color: "text-blue-400",
              bg: "bg-gray-900",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} border border-gray-800 rounded-xl p-4`}
            >
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!mapData && !building && (
        <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-4xl mb-4">🗺</p>
          <p className="text-white font-semibold text-lg mb-2">
            No authority map yet
          </p>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Click Build Map to analyze your tracked queries and generate your
            topical authority map.
          </p>
          <button
            onClick={buildMap}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            🗺 Build Map
          </button>
        </div>
      )}

      {/* Bubble Chart */}
      {mapData && mapData.topics.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">
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
                className="absolute text-xs font-semibold text-green-400 bg-green-950/40 px-2 py-1 rounded"
                style={{ top: "5%", right: "5%" }}
              >
                👑 Dominating
              </div>
              <div
                className="absolute text-xs font-semibold text-yellow-400 bg-yellow-950/40 px-2 py-1 rounded"
                style={{ top: "5%", left: "12%" }}
              >
                📈 Visible but weak
              </div>
              <div
                className="absolute text-xs font-semibold text-orange-400 bg-orange-950/40 px-2 py-1 rounded"
                style={{ bottom: "12%", right: "5%" }}
              >
                💤 Underperforming
              </div>
              <div
                className="absolute text-xs font-semibold text-blue-400 bg-blue-950/40 px-2 py-1 rounded"
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
                  stroke="#374151"
                  opacity={0.5}
                />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 100]}
                  name="Authority Score"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={{ stroke: "#374151" }}
                  label={{
                    value: "Authority Score →",
                    position: "insideBottom",
                    offset: -15,
                    fill: "#6b7280",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 100]}
                  name="Mention Rate %"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={{ stroke: "#374151" }}
                  label={{
                    value: "Mention Rate %",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fill: "#6b7280",
                    fontSize: 12,
                  }}
                />
                <ZAxis type="number" dataKey="z" range={[200, 1200]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>
                      {value}
                    </span>
                  )}
                />
                {/* Quadrant dividers */}
                <ReferenceLine
                  x={50}
                  stroke="#4b5563"
                  strokeDasharray="6 3"
                  strokeWidth={1}
                />
                <ReferenceLine
                  y={50}
                  stroke="#4b5563"
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
          <h3 className="text-lg font-semibold text-white mb-4">
            Topic Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortTopics(mapData.topics).map((topic) => {
              const status = getTopicStatus(topic);
              return (
                <div
                  key={topic.topic}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
                >
                  {/* Topic header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold text-sm">
                        {topic.topic}
                      </h4>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
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
                            <span className="text-gray-400 truncate max-w-[120px]">
                              {brandEntry.brand.name}
                            </span>
                            <span className="text-gray-300 font-mono ml-2 flex-shrink-0">
                              {brandEntry.authority_score.toFixed(0)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
                  <p className="text-xs text-gray-600 mt-3">
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
