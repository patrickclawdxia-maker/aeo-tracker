"use client";

import { useState, useEffect } from "react";

interface Citation {
  domain: string;
  count: number;
  urls: string[];
}

export function CitationsTab({ projectId }: { projectId: number }) {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/projects/${projectId}/citations`)
      .then((r) => r.json())
      .then((d) => {
        setCitations(d.citations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading citations…</div>;
  }

  if (citations.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No citations found in the latest run.</p>
        <p className="text-sm mt-2 text-gray-400">Citations are URLs extracted from AI engine responses.</p>
      </div>
    );
  }

  const maxCount = citations[0]?.count || 1;

  function toggleExpand(domain: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Cited Domains</h3>
        <p className="text-sm text-gray-500 mb-6">
          Domains most frequently cited by AI engines in their responses. Click to expand URLs.
        </p>

        <div className="space-y-3">
          {citations.map((citation, idx) => (
            <div key={citation.domain}>
              <button
                onClick={() => toggleExpand(citation.domain)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-medium text-gray-900 truncate">{citation.domain}</span>
                      <span className="text-indigo-600 font-mono text-sm flex-shrink-0">
                        {citation.count}×
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${(citation.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {expanded.has(citation.domain) ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {expanded.has(citation.domain) && (
                <div className="mt-1 ml-8 bg-white border border-gray-200 rounded-lg p-3 space-y-1">
                  {citation.urls.length === 0 ? (
                    <p className="text-xs text-gray-400">No URLs available</p>
                  ) : (
                    citation.urls.map((url, i) => (
                      <div key={i} className="text-xs">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 hover:underline break-all"
                        >
                          {url}
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
