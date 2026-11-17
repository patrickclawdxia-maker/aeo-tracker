"use client";

import { SentimentBadge } from "./SentimentBadge";
import { engines } from "@/lib/engines/registry";

interface QueryBreakdown {
  query: { id: number; query: string };
  brands: Array<{
    brand: { id: number; name: string };
    mention_count: number;
    avg_position: number;
    snippets: Array<{
      engine_id: string;
      sentiment: string;
      context_snippet: string;
    }>;
  }>;
}

export function QueriesTab({
  queryBreakdown,
}: {
  queryBreakdown: QueryBreakdown[];
}) {
  if (queryBreakdown.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        No query data yet. Run an analysis first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {queryBreakdown.map((qb) => (
        <div
          key={qb.query.id}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">
              🔍 &quot;{qb.query.query}&quot;
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {qb.brands
              .sort((a, b) => b.mention_count - a.mention_count)
              .filter((b) => b.mention_count > 0)
              .map((bq) => (
                <div key={bq.brand.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-gray-900">{bq.brand.name}</div>
                    <div className="flex gap-3 text-sm">
                      <span className="text-gray-500">
                        <span className="text-emerald-600 font-mono">
                          {bq.mention_count}
                        </span>{" "}
                        mentions
                      </span>
                      {bq.avg_position > 0 && (
                        <span className="inline-block px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 text-xs font-mono">
                          #{bq.avg_position.toFixed(1)} avg position
                        </span>
                      )}
                    </div>
                  </div>

                  {bq.snippets.length > 0 && (
                    <div className="space-y-2">
                      {bq.snippets.map((s, i) => {
                        const engine = engines.find(
                          (e) => e.id === s.engine_id
                        );
                        return (
                          <div
                            key={i}
                            className="flex gap-3 items-start text-sm"
                          >
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                              {engine?.name ?? s.engine_id}
                            </span>
                            <SentimentBadge sentiment={s.sentiment} />
                            <span className="text-gray-500 text-xs line-clamp-2">
                              {s.context_snippet}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

            {qb.brands.filter((b) => b.mention_count > 0).length === 0 && (
              <div className="px-6 py-4 text-sm text-gray-400">
                No brands mentioned in this query.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
