"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Brand {
  id: number;
  name: string;
}

interface Query {
  id: number;
  query: string;
}

interface SettingsTabProps {
  projectId: number;
  projectName: string;
  brands: Brand[];
  queries: Query[];
  onRefresh: () => void;
}

export function SettingsTab({
  projectId,
  projectName,
  brands,
  queries,
  onRefresh,
}: SettingsTabProps) {
  const router = useRouter();
  const [newBrand, setNewBrand] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingQuery, setAddingQuery] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Schedule state
  const [schedule, setSchedule] = useState<string>("off");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);

  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionTopic, setSuggestionTopic] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [addingSelected, setAddingSelected] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // Load schedule on mount
  useEffect(() => {
    fetch(`/api/projects/${projectId}/schedule`)
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d.schedule || "off");
        setNextRunAt(d.next_run_at || null);
      })
      .catch(() => {});
  }, [projectId]);

  async function addBrand() {
    if (!newBrand.trim()) return;
    setAddingBrand(true);
    await fetch(`/api/projects/${projectId}/brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBrand }),
    });
    setNewBrand("");
    setAddingBrand(false);
    onRefresh();
  }

  async function deleteBrand(brandId: number) {
    await fetch(`/api/projects/${projectId}/brands/${brandId}`, {
      method: "DELETE",
    });
    onRefresh();
  }

  async function addQuery() {
    if (!newQuery.trim()) return;
    setAddingQuery(true);
    await fetch(`/api/projects/${projectId}/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: newQuery }),
    });
    setNewQuery("");
    setAddingQuery(false);
    onRefresh();
  }

  async function deleteQuery(queryId: number) {
    await fetch(`/api/projects/${projectId}/queries/${queryId}`, {
      method: "DELETE",
    });
    onRefresh();
  }

  async function deleteProject() {
    if (
      !confirm(
        `Delete project "${projectName}" and all its data? This cannot be undone.`
      )
    )
      return;
    setDeleting(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/");
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    const res = await fetch(`/api/projects/${projectId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: schedule === "off" ? null : schedule }),
    });
    const data = await res.json();
    setNextRunAt(data.next_run_at || null);
    setSavingSchedule(false);
  }

  async function generateSuggestions() {
    if (!suggestionTopic.trim()) return;
    setGeneratingSuggestions(true);
    setSuggestionError(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: suggestionTopic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSuggestionError(data.error || "Failed to generate suggestions");
      } else {
        setSuggestions(data.suggestions || []);
        // Select all by default
        setSelectedSuggestions(new Set(data.suggestions.map((_: string, i: number) => i)));
      }
    } catch (err) {
      setSuggestionError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGeneratingSuggestions(false);
    }
  }

  async function addSelectedSuggestions() {
    if (selectedSuggestions.size === 0) return;
    setAddingSelected(true);
    for (const idx of Array.from(selectedSuggestions)) {
      const q = suggestions[idx];
      if (q) {
        await fetch(`/api/projects/${projectId}/queries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
      }
    }
    setAddingSelected(false);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setSuggestionTopic("");
    onRefresh();
  }

  function toggleSuggestion(idx: number) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Brands */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Tracked Brands</h3>
          <p className="text-sm text-gray-500 mt-1">
            Brands to look for in AI engine responses
          </p>
        </div>
        <div className="p-6 space-y-3">
          {brands.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2"
            >
              <span className="text-white">{b.name}</span>
              <button
                onClick={() => deleteBrand(b.id)}
                className="text-gray-500 hover:text-red-400 transition-colors text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="e.g. Salesforce"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBrand()}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={addBrand}
              disabled={addingBrand || !newBrand.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {addingBrand ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {/* Queries */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Tracked Queries</h3>
          <p className="text-sm text-gray-500 mt-1">
            Category queries to ask AI engines
          </p>
        </div>
        <div className="p-6 space-y-3">
          {queries.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2"
            >
              <span className="text-white text-sm">&quot;{q.query}&quot;</span>
              <button
                onClick={() => deleteQuery(q.id)}
                className="text-gray-500 hover:text-red-400 transition-colors text-sm flex-shrink-0 ml-3"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder='e.g. "best CRM software"'
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuery()}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={addQuery}
              disabled={addingQuery || !newQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {addingQuery ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="bg-purple-800 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              title="Suggest queries using AI"
            >
              ✨ Suggest
            </button>
          </div>

          {/* Suggestions Panel */}
          {showSuggestions && (
            <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">✨ Query Suggestions</h4>
                <p className="text-xs text-gray-500">
                  Enter a topic and generate AI-powered query suggestions
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='e.g. "CRM software", "project management tools"'
                  value={suggestionTopic}
                  onChange={(e) => setSuggestionTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateSuggestions()}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={generateSuggestions}
                  disabled={generatingSuggestions || !suggestionTopic.trim()}
                  className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {generatingSuggestions ? (
                    <span className="animate-spin inline-block">⟳</span>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>

              {suggestionError && (
                <p className="text-red-400 text-xs">{suggestionError}</p>
              )}

              {suggestions.length > 0 && (
                <>
                  <div className="space-y-2">
                    {suggestions.map((s, idx) => (
                      <label
                        key={idx}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.has(idx)}
                          onChange={() => toggleSuggestion(idx)}
                          className="mt-0.5 accent-purple-500"
                        />
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                    <span className="text-xs text-gray-500">
                      {selectedSuggestions.size} of {suggestions.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))}
                        className="text-xs text-gray-400 hover:text-gray-200"
                      >
                        Select all
                      </button>
                      <button
                        onClick={() => setSelectedSuggestions(new Set())}
                        className="text-xs text-gray-400 hover:text-gray-200"
                      >
                        Clear
                      </button>
                      <button
                        onClick={addSelectedSuggestions}
                        disabled={addingSelected || selectedSuggestions.size === 0}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        {addingSelected ? "Adding…" : `Add ${selectedSuggestions.size} queries`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Scheduled Auto-Runs</h3>
          <p className="text-sm text-gray-500 mt-1">
            Automatically run analysis on a schedule
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300">Schedule:</label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <button
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {savingSchedule ? "Saving…" : "Save"}
            </button>
          </div>

          {nextRunAt && schedule !== "off" && (
            <p className="text-xs text-gray-400">
              Next run scheduled:{" "}
              <span className="text-indigo-300">
                {new Date(nextRunAt).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}

          <p className="text-xs text-gray-600">
            Note: To trigger scheduled runs, call{" "}
            <code className="bg-gray-800 px-1 rounded">POST /api/cron/run-scheduled</code> from
            your cron system (e.g., Vercel cron, GitHub Actions, or cURL).
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-gray-900 border border-red-900 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-red-900">
          <h3 className="font-semibold text-red-400">Danger Zone</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-4">
            Permanently delete this project and all its data including brands,
            queries, and analysis history.
          </p>
          <button
            onClick={deleteProject}
            disabled={deleting}
            className="bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
