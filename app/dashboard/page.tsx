"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Project {
  id: number;
  name: string;
  created_at: string;
  last_run: string | null;
  brand_count: number;
  query_count: number;
}

interface QuotaData {
  used: number;
  limit: number;
  referral_code: string;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchQuota();
  }, []);

  async function fetchQuota() {
    const res = await fetch("/api/user/quota");
    if (res.ok) {
      const data = await res.json();
      setQuota(data);
    }
  }

  async function copyReferral() {
    if (!quota?.referral_code) return;
    await navigator.clipboard.writeText(quota.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function fetchProjects() {
    setLoading(true);
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    setShowNew(false);
    setCreating(false);
    fetchProjects();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">
            {session?.user?.name ? `Welcome back, ${session.user.name.split(" ")[0]}` : "Track brand visibility across AI search engines"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNew(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Quota widget */}
      {quota && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Daily Queries</span>
              <span className="text-sm text-gray-500">
                {quota.used} / {quota.limit} used
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  quota.used / quota.limit >= 0.9
                    ? "bg-red-500"
                    : quota.used / quota.limit >= 0.7
                    ? "bg-amber-500"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${Math.min(100, Math.round((quota.used / quota.limit) * 100))}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-indigo-50 rounded-lg px-3 py-2">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Share to get +50 more queries</p>
              <code className="text-xs text-indigo-700 font-mono">
                {quota.referral_code}
              </code>
            </div>
            <button
              onClick={copyReferral}
              className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {showNew && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Create New Project</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. CRM Software Tracking"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={createProject}
              disabled={creating || !newName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No projects yet
          </h2>
          <p className="text-gray-500">
            Create your first project to start tracking brand visibility in AI
            engines.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md rounded-xl p-5 transition-all group"
            >
              <h2 className="font-semibold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors mb-3">
                {p.name}
              </h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>🏷️ {p.brand_count} brands</span>
                <span>🔍 {p.query_count} queries</span>
              </div>
              {p.last_run ? (
                <p className="text-xs text-gray-400 mt-3">
                  Last run:{" "}
                  {new Date(p.last_run).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-3">Never run</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
