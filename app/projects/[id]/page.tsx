"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTrack } from "@/app/components/Analytics";
import { OverviewTab } from "./components/OverviewTab";
import { ByEngineTab } from "./components/ByEngineTab";
import { QueriesTab } from "./components/QueriesTab";
import { SettingsTab } from "./components/SettingsTab";
import { TrendsTab } from "./components/TrendsTab";
import { CitationsTab } from "./components/CitationsTab";
import { CompetitorsTab } from "./components/CompetitorsTab";
import { ContentGapsTab } from "./components/ContentGapsTab";
import { ClustersTab } from "./components/ClustersTab";
import { CrawlersTab } from "./components/CrawlersTab";
import { AccuracyTab } from "./components/AccuracyTab";
import { AuthorityMapTab } from "./components/AuthorityMapTab";

interface ProjectData {
  project: { id: number; name: string; created_at: string };
  brands: Array<{ id: number; name: string }>;
  queries: Array<{ id: number; query: string }>;
  runs: Array<{ id: number; created_at: string; status: string }>;
}

interface ResultsData {
  results: BrandResult[];
  latestRun: { id: number; created_at: string; status: string } | null;
  queries: Array<{ id: number; query: string }>;
  queryBreakdown: QueryBreakdown[];
}

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

interface SovData {
  brand: { id: number; name: string };
  overall_sov: number;
  sov_change: number | null;
}

type TabId = "overview" | "engines" | "queries" | "clusters" | "trends" | "citations" | "crawlers" | "competitors" | "authority" | "gaps" | "accuracy" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "engines", label: "By Engine" },
  { id: "queries", label: "Queries" },
  { id: "clusters", label: "Clusters" },
  { id: "trends", label: "Trends" },
  { id: "citations", label: "Citations" },
  { id: "crawlers", label: "Crawlers" },
  { id: "competitors", label: "Competitors" },
  { id: "authority", label: "Authority Map" },
  { id: "gaps", label: "Content Gaps" },
  { id: "accuracy", label: "Accuracy" },
  { id: "settings", label: "Settings" },
];

export default function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const trackEvent = useTrack();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [sovData, setSovData] = useState<SovData[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<string[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [projRes, resultsRes, sovRes] = await Promise.all([
      fetch(`/api/projects/${params.id}`),
      fetch(`/api/projects/${params.id}/results`),
      fetch(`/api/projects/${params.id}/share-of-voice`),
    ]);
    if (projRes.ok) setProject(await projRes.json());
    if (resultsRes.ok) setResults(await resultsRes.json());
    if (sovRes.ok) {
      const d = await sovRes.json();
      setSovData(d.sov || []);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function runAnalysis() {
    setRunning(true);
    setRunProgress([]);
    setRunError(null);
    try {
      const res = await fetch(`/api/projects/${params.id}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error || "Analysis failed");
        setRunProgress(data.progress || []);
      } else {
        setRunProgress(data.progress || []);
        await fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setRunError(msg);
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">Loading project…</div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Project not found.</p>
        <Link href="/" className="text-indigo-600 hover:underline mt-4 block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const latestRun = results?.latestRun;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-indigo-50/30 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="text-gray-900">{project.project.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {project.project.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>
                {project.brands.length} brand
                {project.brands.length !== 1 ? "s" : ""}
              </span>
              <span>·</span>
              <span>
                {project.queries.length} quer
                {project.queries.length !== 1 ? "ies" : "y"}
              </span>
              {latestRun && (
                <>
                  <span>·</span>
                  <span>
                    Last run:{" "}
                    {new Date(latestRun.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
              <span className="hidden sm:inline">·</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10a37f]" />
                ChatGPT
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#4285f4]" />
                Gemini
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#d97706]" />
                Claude
              </span>
            </div>
          </div>

          <button
            onClick={runAnalysis}
            disabled={
              running ||
              project.brands.length === 0 ||
              project.queries.length === 0
            }
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300 disabled:opacity-50"
          >
            {running ? (
              <>
                <span className="animate-spin">⟳</span>
                Running…
              </>
            ) : (
              <>▶ Run Analysis</>
            )}
          </button>
        </div>
      </div>

      {/* Run Progress */}
      {(running || runProgress.length > 0) && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <h4 className="text-sm font-medium text-indigo-800 mb-3">
            {running ? "Analysis in progress…" : "Analysis complete"}
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {runProgress.map((line, i) => (
              <div key={i} className="text-xs font-mono text-indigo-700">
                {line}
              </div>
            ))}
            {running && (
              <div className="text-xs font-mono text-indigo-500 animate-pulse">
                ▸ Processing…
              </div>
            )}
          </div>
        </div>
      )}

      {runError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {runError}
        </div>
      )}

      {/* Warning if no brands/queries */}
      {(project.brands.length === 0 || project.queries.length === 0) && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
          {project.brands.length === 0 && (
            <p>⚠ Add at least one brand in Settings before running analysis.</p>
          )}
          {project.queries.length === 0 && (
            <p>⚠ Add at least one query in Settings before running analysis.</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-0 z-10 mb-6 flex gap-0 overflow-x-auto border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); trackEvent("tab_viewed", "navigation", { tab: t.id, projectId: params.id }); }}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? "rounded-t-lg border-indigo-600 bg-indigo-50/50 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewTab results={results?.results ?? []} sovData={sovData} />
      )}
      {tab === "engines" && (
        <ByEngineTab results={results?.results ?? []} />
      )}
      {tab === "queries" && (
        <QueriesTab queryBreakdown={results?.queryBreakdown ?? []} />
      )}
      {tab === "trends" && (
        <TrendsTab projectId={project.project.id} />
      )}
      {tab === "citations" && (
        <CitationsTab projectId={project.project.id} />
      )}
      {tab === "competitors" && (
        <CompetitorsTab projectId={project.project.id} />
      )}
      {tab === "authority" && (
        <AuthorityMapTab projectId={project.project.id} brands={project.brands} />
      )}
      {tab === "gaps" && (
        <ContentGapsTab projectId={project.project.id} />
      )}
      {tab === "clusters" && (
        <ClustersTab projectId={project.project.id} queries={project.queries} />
      )}
      {tab === "crawlers" && (
        <CrawlersTab projectId={project.project.id} />
      )}
      {tab === "accuracy" && (
        <AccuracyTab projectId={project.project.id} />
      )}
      {tab === "settings" && (
        <SettingsTab
          projectId={project.project.id}
          projectName={project.project.name}
          brands={project.brands}
          queries={project.queries}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
