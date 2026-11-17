"use client";

import { useState, useEffect } from "react";

interface ClusterQuery {
  id: number;
  query: string;
}

interface Cluster {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  queries: ClusterQuery[];
  cluster_mention_rate: number | null;
  per_engine: Record<string, number>;
}

interface TrackedQuery {
  id: number;
  query: string;
}

const ENGINE_COLORS: Record<string, string> = {
  "chatgpt": "bg-green-900/50 text-green-300 border border-green-800",
  "gpt-4": "bg-green-900/50 text-green-300 border border-green-800",
  "gemini": "bg-blue-900/50 text-blue-300 border border-blue-800",
  "claude": "bg-purple-900/50 text-purple-300 border border-purple-800",
};

function engineLabel(engineId: string): string {
  if (engineId.toLowerCase().includes("chatgpt") || engineId.toLowerCase().includes("gpt")) return "ChatGPT";
  if (engineId.toLowerCase().includes("gemini")) return "Gemini";
  if (engineId.toLowerCase().includes("claude")) return "Claude";
  return engineId;
}

function engineColor(engineId: string): string {
  const lower = engineId.toLowerCase();
  if (lower.includes("gpt") || lower.includes("chatgpt")) return ENGINE_COLORS["chatgpt"];
  if (lower.includes("gemini")) return ENGINE_COLORS["gemini"];
  if (lower.includes("claude")) return ENGINE_COLORS["claude"];
  return "bg-gray-800 text-gray-300 border border-gray-700";
}

function VisibilityBadge({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400">No data</span>;
  }
  const color = rate >= 50
    ? "bg-green-900/50 text-green-300 border border-green-800"
    : rate >= 25
    ? "bg-yellow-900/50 text-yellow-300 border border-yellow-800"
    : "bg-red-900/50 text-red-300 border border-red-800";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {rate}% visibility
    </span>
  );
}

export function ClustersTab({
  projectId,
  queries,
}: {
  projectId: number;
  queries: TrackedQuery[];
}) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formQueryIds, setFormQueryIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchClusters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function fetchClusters() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/clusters`);
      const data = await res.json();
      setClusters(data.clusters || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function openNewForm() {
    setEditingCluster(null);
    setFormName("");
    setFormDescription("");
    setFormQueryIds([]);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(cluster: Cluster) {
    setEditingCluster(cluster);
    setFormName(cluster.name);
    setFormDescription(cluster.description || "");
    setFormQueryIds(cluster.queries.map((q) => q.id));
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingCluster(null);
    setError(null);
  }

  function toggleQuery(queryId: number) {
    setFormQueryIds((prev) =>
      prev.includes(queryId) ? prev.filter((id) => id !== queryId) : [...prev, queryId]
    );
  }

  async function saveCluster() {
    if (!formName.trim()) {
      setError("Cluster name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editingCluster
        ? `/api/projects/${projectId}/clusters/${editingCluster.id}`
        : `/api/projects/${projectId}/clusters`;
      const method = editingCluster ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          queryIds: formQueryIds,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save cluster");
      } else {
        await fetchClusters();
        setShowForm(false);
        setEditingCluster(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCluster(cluster: Cluster) {
    if (!confirm(`Delete cluster "${cluster.name}"?`)) return;
    setDeletingId(cluster.id);
    try {
      await fetch(`/api/projects/${projectId}/clusters/${cluster.id}`, {
        method: "DELETE",
      });
      await fetchClusters();
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        <span className="animate-spin inline-block mr-2">⟳</span>Loading clusters…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Prompt Clusters</h3>
          <p className="text-sm text-gray-500 mt-1">
            Group related queries to track combined visibility scores
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        >
          + New Cluster
        </button>
      </div>

      {/* New/Edit Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <h4 className="font-medium text-white">
            {editingCluster ? "Edit Cluster" : "New Cluster"}
          </h4>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Cluster Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Product Awareness Queries"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of this cluster's intent"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Include Queries</label>
            {queries.length === 0 ? (
              <p className="text-sm text-gray-500">No tracked queries yet. Add queries in Settings first.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queries.map((q) => (
                  <label key={q.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formQueryIds.includes(q.id)}
                      onChange={() => toggleQuery(q.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      {q.query}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={saveCluster}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Saving…" : "Save Cluster"}
            </button>
            <button
              onClick={cancelForm}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clusters List */}
      {clusters.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-lg mb-2">No clusters yet</p>
          <p className="text-sm text-gray-600">
            Create clusters to group related queries and see combined visibility scores
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-semibold text-white">{cluster.name}</h4>
                    <VisibilityBadge rate={cluster.cluster_mention_rate} />
                  </div>
                  {cluster.description && (
                    <p className="text-sm text-gray-500 mt-1">{cluster.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditForm(cluster)}
                    className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCluster(cluster)}
                    disabled={deletingId === cluster.id}
                    className="text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/50 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {deletingId === cluster.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>

              {/* Member queries */}
              {cluster.queries.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {cluster.queries.map((q) => (
                    <span
                      key={q.id}
                      className="px-2 py-1 rounded-md bg-gray-800 text-gray-300 text-xs"
                    >
                      {q.query}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600 mb-3">No queries in this cluster</p>
              )}

              {/* Per-engine breakdown */}
              {Object.keys(cluster.per_engine).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cluster.per_engine).map(([engineId, rate]) => (
                    <span
                      key={engineId}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${engineColor(engineId)}`}
                    >
                      {engineLabel(engineId)}: {rate}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
