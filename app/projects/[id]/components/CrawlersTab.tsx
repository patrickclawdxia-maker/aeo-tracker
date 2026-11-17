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
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-800">
        🟢 Allowed
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-800">
        🔴 Blocked
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
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
      <div className="text-center py-16 text-gray-500">
        <span className="animate-spin inline-block mr-2">⟳</span>Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">AI Crawler Visibility</h3>
        <p className="text-sm text-gray-500 mt-1">
          Check which AI crawlers can access your site based on your robots.txt
        </p>
      </div>

      {/* Domain input */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <label className="block text-sm text-gray-400 mb-2">Your Domain</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            onKeyDown={(e) => e.key === "Enter" && runCheck()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={runCheck}
            disabled={checking}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-2"
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
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}

        {check && (
          <p className="text-xs text-gray-500 mt-2">
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
              className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-sm text-red-300"
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
                className={`bg-gray-900 border rounded-xl p-4 space-y-3 ${
                  crawler.status === "blocked" ? "border-red-900" : "border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <p className="text-white text-sm font-medium leading-tight">{crawler.name}</p>
                      <p className="text-gray-500 text-xs font-mono mt-0.5">{crawler.userAgent}</p>
                    </div>
                  </div>
                </div>

                <StatusBadge status={crawler.status} />

                {crawler.docsUrl && (
                  <a
                    href={crawler.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-xs underline"
                  >
                    View docs →
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Robots.txt viewer */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRobots((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span>robots.txt contents</span>
              <span>{showRobots ? "▲" : "▼"}</span>
            </button>
            {showRobots && (
              <div className="px-5 pb-5 border-t border-gray-800">
                {check.robots_txt ? (
                  <pre className="text-xs font-mono text-gray-400 mt-3 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                    {check.robots_txt}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500 mt-3">
                    robots.txt not found or could not be fetched.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tip */}
          <div className="bg-indigo-950/40 border border-indigo-800 rounded-xl p-4 text-sm text-indigo-300">
            <p className="font-medium mb-1">💡 Tip: Allow AI crawlers</p>
            <p className="text-indigo-400 text-xs">
              To explicitly allow AI crawlers, add entries like this to your robots.txt:
            </p>
            <pre className="mt-2 text-xs font-mono text-indigo-300 bg-indigo-950/60 rounded p-2">
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
        <div className="text-center py-16 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <p>Enter your domain and click &quot;Check Now&quot; to analyze AI crawler access</p>
        </div>
      )}
    </div>
  );
}
