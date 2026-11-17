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
  blog: "bg-blue-50 text-blue-700 border border-blue-200",
  guide: "bg-violet-50 text-violet-700 border border-violet-200",
  comparison: "bg-amber-50 text-amber-700 border border-amber-200",
  FAQ: "bg-green-50 text-green-700 border border-green-200",
};

function MentionRateBadge({ rate }: { rate: number }) {
  const color =
    rate < 20
      ? "bg-red-50 text-red-700 border border-red-200"
      : rate < 35
      ? "bg-orange-50 text-orange-700 border border-orange-200"
      : "bg-amber-50 text-amber-700 border border-amber-200";

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
    return <div className="text-center py-16 text-gray-400">Loading content gaps…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header + Generate button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Content Gap Analysis</h3>
          <p className="text-sm text-gray-500 mt-1">
            Queries where brand visibility is below 50% — with AI-generated content recommendations
          </p>
        </div>
        <button
          onClick={generateRecommendations}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {gaps.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p>No content gaps found.</p>
          <p className="text-sm mt-2 text-gray-400">
            Either all brands have &gt;50% visibility, or no analysis has been run yet.
          </p>
          {!generating && (
            <button
              onClick={generateRecommendations}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              ✨ Analyze gaps
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {gaps.map((brandGap) => (
            <div key={brandGap.brand.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h4 className="font-semibold text-gray-900 text-lg">{brandGap.brand.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {brandGap.gaps.length} gap{brandGap.gaps.length !== 1 ? "s" : ""} identified
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {brandGap.gaps.map((gap) => (
                  <div key={gap.query.id} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-gray-900 font-medium flex-1">
                        &ldquo;{gap.query.query}&rdquo;
                      </span>
                      <MentionRateBadge rate={gap.mention_rate} />
                    </div>

                    {gap.recommendations.length === 0 ? (
                      <p className="text-sm text-gray-400">No recommendations generated yet.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {gap.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg p-4 space-y-2"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  CONTENT_TYPE_COLORS[rec.content_type.toLowerCase()] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {rec.content_type}
                              </span>
                            </div>
                            <p className="text-gray-900 text-sm font-medium leading-snug">
                              {rec.title}
                            </p>
                            <p className="text-gray-600 text-xs leading-relaxed">
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
