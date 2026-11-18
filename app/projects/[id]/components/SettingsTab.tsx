"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Brand {
  id: number;
  name: string;
  aliases?: string[];
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
  // Aliases state: brandId → editing state
  const [editingAliases, setEditingAliases] = useState<number | null>(null);
  const [aliasInput, setAliasInput] = useState("");
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

  async function saveAliases(brandId: number, currentAliases: string[]) {
    // Parse comma-separated input and merge with existing
    const newOnes = aliasInput.split(",").map((a) => a.trim()).filter(Boolean);
    const combined = currentAliases.concat(newOnes);
    const seen2 = new Set<string>();
    const merged = combined.filter((a) => { if (!a || seen2.has(a)) return false; seen2.add(a); return true; });
    await fetch(`/api/projects/${projectId}/brands/${brandId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aliases: merged }),
    });
    setEditingAliases(null);
    setAliasInput("");
    onRefresh();
  }

  async function removeAlias(brandId: number, currentAliases: string[], alias: string) {
    const updated = currentAliases.filter((a) => a !== alias);
    await fetch(`/api/projects/${projectId}/brands/${brandId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aliases: updated }),
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
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Tracked Brands</h3>
          <p className="text-sm text-gray-500 mt-1">
            Brands to look for in AI engine responses
          </p>
        </div>
        <div className="p-6 space-y-3">
          {brands.map((b) => (
            <div key={b.id} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              {/* Brand row */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-900 truncate">{b.name}</span>
                  {b.aliases && b.aliases.length > 0 && (
                    <span className="text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 shrink-0">
                      +{b.aliases.length} alias{b.aliases.length !== 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingAliases(editingAliases === b.id ? null : b.id);
                      setAliasInput("");
                    }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    {editingAliases === b.id ? "Close" : "Aliases"}
                  </button>
                  <button
                    onClick={() => deleteBrand(b.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Aliases panel */}
              {editingAliases === b.id && (
                <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
                  <p className="text-xs text-gray-500">
                    Add alternate spellings, abbreviations, or common misspellings (comma-separated).
                    <span className="ml-1 text-indigo-500">Fuzzy matching is on by default — aliases let you be more specific.</span>
                  </p>
                  {/* Existing aliases */}
                  {b.aliases && b.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {b.aliases.map((alias) => (
                        <span
                          key={alias}
                          className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs rounded-full px-2.5 py-0.5"
                        >
                          {alias}
                          <button
                            onClick={() => removeAlias(b.id, b.aliases ?? [], alias)}
                            className="hover:text-red-500 transition-colors font-bold leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Add new aliases */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder='e.g. "chatgpt, chat gpt, GPT-4"'
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveAliases(b.id, b.aliases ?? [])}
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => saveAliases(b.id, b.aliases ?? [])}
                      disabled={!aliasInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="e.g. Salesforce"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBrand()}
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={addBrand}
              disabled={addingBrand || !newBrand.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {addingBrand ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {/* Queries */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Tracked Queries</h3>
          <p className="text-sm text-gray-500 mt-1">
            Category queries to ask AI engines
          </p>
        </div>
        <div className="p-6 space-y-3">
          {queries.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2"
            >
              <span className="text-gray-700 text-sm">&quot;{q.query}&quot;</span>
              <button
                onClick={() => deleteQuery(q.id)}
                className="text-gray-400 hover:text-red-600 transition-colors text-sm flex-shrink-0 ml-3"
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
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={addQuery}
              disabled={addingQuery || !newQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {addingQuery ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="bg-violet-100 hover:bg-violet-200 text-violet-700 border border-violet-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              title="Suggest queries using AI"
            >
              ✨ Suggest
            </button>
          </div>

          {/* Suggestions Panel */}
          {showSuggestions && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">✨ Query Suggestions</h4>
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
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={generateSuggestions}
                  disabled={generatingSuggestions || !suggestionTopic.trim()}
                  className="bg-violet-100 hover:bg-violet-200 text-violet-700 border border-violet-300 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {generatingSuggestions ? (
                    <span className="animate-spin inline-block">⟳</span>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>

              {suggestionError && (
                <p className="text-red-600 text-xs">{suggestionError}</p>
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
                          className="mt-0.5 accent-indigo-600"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {selectedSuggestions.size} of {suggestions.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Select all
                      </button>
                      <button
                        onClick={() => setSelectedSuggestions(new Set())}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                      <button
                        onClick={addSelectedSuggestions}
                        disabled={addingSelected || selectedSuggestions.size === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
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
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Scheduled Auto-Runs</h3>
          <p className="text-sm text-gray-500 mt-1">
            Automatically run analysis on a schedule
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Schedule:</label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <button
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {savingSchedule ? "Saving…" : "Save"}
            </button>
          </div>

          {nextRunAt && schedule !== "off" && (
            <p className="text-xs text-gray-500">
              Next run scheduled:{" "}
              <span className="text-indigo-600">
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

          <p className="text-xs text-gray-400">
            Note: To trigger scheduled runs, call{" "}
            <code className="bg-gray-100 text-gray-700 px-1 rounded">POST /api/cron/run-scheduled</code> from
            your cron system (e.g., Vercel cron, GitHub Actions, or cURL).
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-red-200">
          <h3 className="font-semibold text-red-600">Danger Zone</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete this project and all its data including brands,
            queries, and analysis history.
          </p>
          <button
            onClick={deleteProject}
            disabled={deleting}
            className="bg-white hover:bg-red-50 border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
