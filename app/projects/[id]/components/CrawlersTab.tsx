"use client";

import { useState, useEffect } from "react";

interface CrawlerResult {
  id: string;
  name: string;
  userAgent: string;
  status: "allowed" | "blocked" | "not_mentioned";
  docsUrl: string;
}

interface CrawlerCheck {
  domain: string;
  checked_at: string;
  crawlers: CrawlerResult[];
  robots_txt: string | null;
}

function StatusBadge({ status }: { status: CrawlerResult["status"] }) {
  if (status === "allowed") {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        🟢 Allowed
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        🔴 Blocked
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      ⚪ Not Mentioned
    </span>
  );
}

export function CrawlersTab({ projectId }: { projectId: number }) {
  const [check, setCheck] = useState<CrawlerCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRobots, setShowRobots] = useState(false);

  useEffect(() => {
    fetchLatestCheck();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function fetchLatestCheck() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/crawlers`);
      const data = await res.json();
      if (data.check) {
        setCheck(data.check);
        setDomain(data.check.domain);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function runCheck() {
    if (!domain.trim()) {
      setError("Please enter a domain");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/crawlers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to check crawlers");
      } else {
        setCheck(data);
        setShowRobots(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setChecking(false);
    }
  }

  const blockedCrawlers = check?.crawlers.filter((c) => c.status === "blocked") || [];

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <span className="animate-spin inline-block mr-2">⟳</span>Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">AI Crawler Visibility</h3>
        <p className="text-sm text-gray-500 mt-1">
          Check which AI crawlers can access your site based on your robots.txt
        </p>
      </div>

      {/* Domain input */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <label className="block text-sm text-gray-500 mb-2">Your Domain</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            onKeyDown={(e) => e.key === "Enter" && runCheck()}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={runCheck}
            disabled={checking}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-2"
          >
            {checking ? (
              <>
                <span className="animate-spin">⟳</span>
                Checking…
              </>
            ) : (
              "Check Now"
            )}
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}

        {check && (
          <p className="text-xs text-gray-400 mt-2">
            Last checked: {new Date(check.checked_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Blocked warnings */}
      {blockedCrawlers.length > 0 && (
        <div className="space-y-2">
          {blockedCrawlers.map((c) => (
            <div
              key={c.id}
              className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700"
            >
              ⚠️ <strong>{c.name}</strong> is blocked in your robots.txt. This may reduce your AI search visibility.
            </div>
          ))}
        </div>
      )}

      {/* Crawlers grid */}
      {check ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {check.crawlers.map((crawler) => (
              <div
                key={crawler.id}
                className={`bg-white border rounded-xl p-4 space-y-3 shadow-sm ${
                  crawler.status === "blocked" ? "border-red-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <p className="text-gray-900 text-sm font-medium leading-tight">{crawler.name}</p>
                      <p className="text-gray-400 text-xs font-mono mt-0.5">{crawler.userAgent}</p>
                    </div>
                  </div>
                </div>

                <StatusBadge status={crawler.status} />

                {crawler.docsUrl && (
                  <a
                    href={crawler.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 text-xs underline"
                  >
                    View docs →
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Robots.txt viewer */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setShowRobots((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>robots.txt contents</span>
              <span>{showRobots ? "▲" : "▼"}</span>
            </button>
            {showRobots && (
              <div className="px-5 pb-5 border-t border-gray-200">
                {check.robots_txt ? (
                  <pre className="text-xs font-mono text-gray-700 mt-3 whitespace-pre-wrap break-all max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3">
                    {check.robots_txt}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-400 mt-3">
                    robots.txt not found or could not be fetched.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tip */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700">
            <p className="font-medium mb-1">💡 Tip: Allow AI crawlers</p>
            <p className="text-indigo-600 text-xs">
              To explicitly allow AI crawlers, add entries like this to your robots.txt:
            </p>
            <pre className="mt-2 text-xs font-mono text-indigo-700 bg-white border border-indigo-100 rounded p-2">
{`User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /`}
            </pre>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p>Enter your domain and click &quot;Check Now&quot; to analyze AI crawler access</p>
        </div>
      )}
    </div>
  );
}
