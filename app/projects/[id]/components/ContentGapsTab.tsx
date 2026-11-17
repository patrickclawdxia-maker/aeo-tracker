"use client";

import { useState, useEffect } from "react";

interface Recommendation {
  title: string;
  content_type: string;
  rationale: string;
}

interface Gap {
  query: { id: number; query: string };
  mention_rate: number;
  recommendations: Recommendation[];
}

interface BrandGap {
  brand: { id: number; name: string };
  gaps: Gap[];
}

const CONTENT_TYPE_COLORS: Record<string, string> = {
  blog: "bg-blue-900/50 text-blue-300 border border-blue-800",
  guide: "bg-purple-900/50 text-purple-300 border border-purple-800",
  comparison: "bg-yellow-900/50 text-yellow-300 border border-yellow-800",
  FAQ: "bg-green-900/50 text-green-300 border border-green-800",
};

function MentionRateBadge({ rate }: { rate: number }) {
  const color =
    rate < 20
      ? "bg-red-900/50 text-red-300 border border-red-800"
      : rate < 35
      ? "bg-orange-900/50 text-orange-300 border border-orange-800"
      : "bg-yellow-900/50 text-yellow-300 border border-yellow-800";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {rate}% visibility
    </span>
  );
}

export function ContentGapsTab({ projectId }: { projectId: number }) {
  const [gaps, setGaps] = useState<BrandGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGaps();
  }, [projectId]);

  async function fetchGaps() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/gaps`);
      const data = await res.json();
      setGaps(data.gaps || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function generateRecommendations() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/gaps`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate recommendations");
      } else {
        const data = await res.json();
        setGaps(data.gaps || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading content gaps…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header + Generate button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Content Gap Analysis</h3>
          <p className="text-sm text-gray-500 mt-1">
            Queries where brand visibility is below 50% — with AI-generated content recommendations
          </p>
        </div>
        <button
          onClick={generateRecommendations}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
        >
          {generating ? (
            <>
              <span className="animate-spin">⟳</span>
              Generating…
            </>
          ) : (
            <>✨ Generate Recommendations</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {gaps.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <p>No content gaps found.</p>
          <p className="text-sm mt-2 text-gray-600">
            Either all brands have &gt;50% visibility, or no analysis has been run yet.
          </p>
          {!generating && (
            <button
              onClick={generateRecommendations}
              className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              ✨ Analyze gaps
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {gaps.map((brandGap) => (
            <div key={brandGap.brand.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/30">
                <h4 className="font-semibold text-white text-lg">{brandGap.brand.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {brandGap.gaps.length} gap{brandGap.gaps.length !== 1 ? "s" : ""} identified
                </p>
              </div>

              <div className="divide-y divide-gray-800">
                {brandGap.gaps.map((gap) => (
                  <div key={gap.query.id} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-white font-medium flex-1">
                        &ldquo;{gap.query.query}&rdquo;
                      </span>
                      <MentionRateBadge rate={gap.mention_rate} />
                    </div>

                    {gap.recommendations.length === 0 ? (
                      <p className="text-sm text-gray-500">No recommendations generated yet.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {gap.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-800/50 rounded-lg p-4 space-y-2"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  CONTENT_TYPE_COLORS[rec.content_type.toLowerCase()] ||
                                  "bg-gray-700 text-gray-300"
                                }`}
                              >
                                {rec.content_type}
                              </span>
                            </div>
                            <p className="text-white text-sm font-medium leading-snug">
                              {rec.title}
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                              {rec.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
