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

function engineLabel(engineId: string): string {
  if (engineId.toLowerCase().includes("chatgpt") || engineId.toLowerCase().includes("gpt")) return "ChatGPT";
  if (engineId.toLowerCase().includes("gemini")) return "Gemini";
  if (engineId.toLowerCase().includes("claude")) return "Claude";
  return engineId;
}

function engineColor(engineId: string): string {
  const lower = engineId.toLowerCase();
  if (lower.includes("gpt") || lower.includes("chatgpt")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (lower.includes("gemini")) return "bg-blue-50 text-blue-700 border border-blue-200";
  if (lower.includes("claude")) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

function VisibilityBadge({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">No data</span>;
  }
  const color = rate >= 50
    ? "bg-green-50 text-green-700 border border-green-200"
    : rate >= 25
    ? "bg-amber-50 text-amber-700 border border-amber-200"
    : "bg-red-50 text-red-700 border border-red-200";

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
      <div className="text-center py-16 text-gray-400">
        <span className="animate-spin inline-block mr-2">⟳</span>Loading clusters…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Prompt Clusters</h3>
          <p className="text-sm text-gray-500 mt-1">
            Group related queries to track combined visibility scores
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        >
          + New Cluster
        </button>
      </div>

      {/* New/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h4 className="font-medium text-gray-900">
            {editingCluster ? "Edit Cluster" : "New Cluster"}
          </h4>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Cluster Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Product Awareness Queries"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Description (optional)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of this cluster's intent"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">Include Queries</label>
            {queries.length === 0 ? (
              <p className="text-sm text-gray-400">No tracked queries yet. Add queries in Settings first.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queries.map((q) => (
                  <label key={q.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formQueryIds.includes(q.id)}
                      onChange={() => toggleQuery(q.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {q.query}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={saveCluster}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Saving…" : "Save Cluster"}
            </button>
            <button
              onClick={cancelForm}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clusters List */}
      {clusters.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-lg mb-2 text-gray-900">No clusters yet</p>
          <p className="text-sm text-gray-500">
            Create clusters to group related queries and see combined visibility scores
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <div key={cluster.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{cluster.name}</h4>
                    <VisibilityBadge rate={cluster.cluster_mention_rate} />
                  </div>
                  {cluster.description && (
                    <p className="text-sm text-gray-500 mt-1">{cluster.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditForm(cluster)}
                    className="text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCluster(cluster)}
                    disabled={deletingId === cluster.id}
                    className="text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-medium transition-colors disabled:opacity-50"
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
                      className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs"
                    >
                      {q.query}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-3">No queries in this cluster</p>
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
