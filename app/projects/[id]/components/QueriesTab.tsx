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
      <div className="text-center py-16 text-gray-500">
        No query data yet. Run an analysis first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {queryBreakdown.map((qb) => (
        <div
          key={qb.query.id}
          className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/30">
            <h3 className="font-semibold text-white text-sm">
              🔍 &quot;{qb.query.query}&quot;
            </h3>
          </div>

          <div className="divide-y divide-gray-800">
            {qb.brands
              .sort((a, b) => b.mention_count - a.mention_count)
              .filter((b) => b.mention_count > 0)
              .map((bq) => (
                <div key={bq.brand.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-white">{bq.brand.name}</div>
                    <div className="flex gap-3 text-sm">
                      <span className="text-gray-400">
                        <span className="text-teal-400 font-mono">
                          {bq.mention_count}
                        </span>{" "}
                        mentions
                      </span>
                      {bq.avg_position > 0 && (
                        <span className="inline-block px-2 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800 text-xs font-mono">
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
                            <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                              {engine?.name ?? s.engine_id}
                            </span>
                            <SentimentBadge sentiment={s.sentiment} />
                            <span className="text-gray-400 text-xs line-clamp-2">
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
              <div className="px-6 py-4 text-sm text-gray-500">
                No brands mentioned in this query.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
