"use client";

import { useState, useEffect } from "react";

interface AccuracyCheck {
  raw_response_id: number;
  accurate: boolean;
  issues: string[];
  engine_id: string;
  response_text: string;
  query_text: string;
  checked_at: string;
}

interface BrandAccuracy {
  brand_id: number;
  brand_name: string;
  facts: string | null;
  checks: AccuracyCheck[];
}

interface AccuracyData {
  run_id: number;
  brands: BrandAccuracy[];
}

function engineLabel(engineId: string): string {
  if (engineId.toLowerCase().includes("chatgpt") || engineId.toLowerCase().includes("gpt")) return "ChatGPT";
  if (engineId.toLowerCase().includes("gemini")) return "Gemini";
  if (engineId.toLowerCase().includes("claude")) return "Claude";
  return engineId;
}

function ResponseCard({ check }: { check: AccuracyCheck }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          {engineLabel(check.engine_id)}
        </span>
        <span className="text-gray-500 text-xs">&ldquo;{check.query_text}&rdquo;</span>
      </div>

      <ul className="space-y-1">
        {check.issues.map((issue, idx) => (
          <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">⚠</span>
            <span>{issue}</span>
          </li>
        ))}
      </ul>

      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-indigo-600 hover:text-indigo-700 text-xs underline"
        >
          {expanded ? "Hide response" : "View full response"}
        </button>
        {expanded && (
          <div className="mt-2 bg-white border border-gray-200 rounded p-3 text-xs text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {check.response_text}
          </div>
        )}
      </div>
    </div>
  );
}

function BrandSection({
  brand,
  projectId,
  onRefresh,
}: {
  brand: BrandAccuracy;
  projectId: number;
  onRefresh: () => void;
}) {
  const [editingFacts, setEditingFacts] = useState(false);
  const [factsText, setFactsText] = useState(brand.facts || "");
  const [savingFacts, setSavingFacts] = useState(false);
  const [factsError, setFactsError] = useState<string | null>(null);

  const inaccurateChecks = brand.checks.filter((c) => !c.accurate);

  async function saveFacts() {
    if (!factsText.trim()) {
      setFactsError("Facts cannot be empty");
      return;
    }
    setSavingFacts(true);
    setFactsError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/brand-facts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.brand_id, facts: factsText }),
      });
      if (!res.ok) {
        const d = await res.json();
        setFactsError(d.error || "Failed to save facts");
      } else {
        setEditingFacts(false);
        onRefresh();
      }
    } catch (err) {
      setFactsError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSavingFacts(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-gray-900 text-lg">{brand.brand_name}</h4>
          {brand.checks.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {inaccurateChecks.length} issue{inaccurateChecks.length !== 1 ? "s" : ""} found across {brand.checks.length} checked response{brand.checks.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => { setEditingFacts(true); setFactsText(brand.facts || ""); }}
          className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
        >
          {brand.facts ? "Edit Brand Facts" : "Add Brand Facts"}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Facts editor */}
        {editingFacts && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
            <label className="block text-sm text-gray-500">
              Verified facts about {brand.brand_name}
            </label>
            <textarea
              value={factsText}
              onChange={(e) => setFactsText(e.target.value)}
              rows={5}
              placeholder={`Enter verified facts, e.g.:\n- Founded in 2010 by Jane Smith\n- Headquartered in San Francisco\n- Provides B2B SaaS for logistics companies\n- Has 500+ enterprise customers`}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-gray-400"
            />
            {factsError && <p className="text-red-600 text-sm">{factsError}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveFacts}
                disabled={savingFacts}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {savingFacts ? "Saving…" : "Save Facts"}
              </button>
              <button
                onClick={() => setEditingFacts(false)}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Show current facts summary if not editing */}
        {!editingFacts && brand.facts && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Verified Facts</p>
            <p className="whitespace-pre-line text-xs leading-relaxed">{brand.facts}</p>
          </div>
        )}

        {/* No facts state */}
        {!editingFacts && !brand.facts && (
          <div className="text-center py-8 text-gray-400">
            <p>Add verified facts about your brand to enable accuracy monitoring</p>
            <button
              onClick={() => setEditingFacts(true)}
              className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Add Brand Facts
            </button>
          </div>
        )}

        {/* Accuracy results */}
        {brand.facts && brand.checks.length > 0 && (
          <>
            {inaccurateChecks.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-xl border border-green-200">
                <p className="text-green-700">✅ No accuracy issues detected in the latest run</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-red-600">
                  {inaccurateChecks.length} inaccurate response{inaccurateChecks.length !== 1 ? "s" : ""} detected
                </h5>
                {inaccurateChecks.map((check) => (
                  <ResponseCard key={check.raw_response_id} check={check} />
                ))}
              </div>
            )}
          </>
        )}

        {brand.facts && brand.checks.length === 0 && !editingFacts && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No accuracy checks run yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click &quot;Run Accuracy Check&quot; to analyze the latest run.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AccuracyTab({ projectId }: { projectId: number }) {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/accuracy`);
      const d = await res.json();
      setData(d);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function runAccuracyCheck() {
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/accuracy`, {
        method: "POST",
      });
      const d = await res.json();
      if (!res.ok) {
        setRunError(d.error || "Accuracy check failed");
      } else {
        setRunResult(
          `Checked ${d.total_checked} responses — found ${d.total_issues} issue${d.total_issues !== 1 ? "s" : ""}`
        );
        await fetchData();
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  // Summary stats
  const totalIssues = data?.brands.reduce(
    (sum, b) => sum + b.checks.filter((c) => !c.accurate).length,
    0
  ) ?? 0;
  const totalResponses = data?.brands.reduce((sum, b) => sum + b.checks.length, 0) ?? 0;

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <span className="animate-spin inline-block mr-2">⟳</span>Loading accuracy data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Answer Accuracy Monitoring</h3>
          <p className="text-sm text-gray-500 mt-1">
            Detect factually incorrect claims AI engines make about your brand
          </p>
        </div>
        <button
          onClick={runAccuracyCheck}
          disabled={running}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-2"
        >
          {running ? (
            <>
              <span className="animate-spin">⟳</span>
              Checking…
            </>
          ) : (
            <>🔍 Run Accuracy Check</>
          )}
        </button>
      </div>

      {/* Summary stats */}
      {totalResponses > 0 && (
        <div className={`rounded-xl p-4 text-sm ${totalIssues > 0 ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
          {totalIssues > 0
            ? `⚠️ ${totalIssues} issue${totalIssues !== 1 ? "s" : ""} found across ${totalResponses} checked response${totalResponses !== 1 ? "s" : ""}`
            : `✅ No accuracy issues detected across ${totalResponses} checked response${totalResponses !== 1 ? "s" : ""}`
          }
        </div>
      )}

      {runResult && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700">
          ✓ {runResult}
        </div>
      )}

      {runError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {runError}
        </div>
      )}

      {/* Per-brand sections */}
      {data && data.brands.length > 0 ? (
        <div className="space-y-6">
          {data.brands.map((brand) => (
            <BrandSection
              key={brand.brand_id}
              brand={brand}
              projectId={projectId}
              onRefresh={fetchData}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p>No brands found. Add brands in Settings to get started.</p>
        </div>
      )}
    </div>
  );
}
