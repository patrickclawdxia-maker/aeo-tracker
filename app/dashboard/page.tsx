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

const PROJECT_COLORS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-pink-500",
  "from-blue-500 to-indigo-400",
  "from-rose-500 to-orange-400",
];

function relativeTime(dateString: string | null) {
  if (!dateString) return "Never run";

  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
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
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/60 p-7 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="mb-2 text-sm font-semibold text-indigo-600">Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-950">
              {session?.user?.name ? `Welcome back, ${session.user.name.split(" ")[0]}` : "Welcome back"}
            </h1>
            <p className="mt-1 text-gray-500">
              Track your brand across AI search engines
          </p>
        </div>
          <button
            onClick={() => setShowNew(true)}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-indigo-300"
          >
            Create project
          </button>
        </div>
      </div>

      {/* Quota widget */}
      {quota && (
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Daily Queries</span>
              <span className="text-sm font-medium text-gray-500">
                {quota.used} / {quota.limit} used
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${
                  quota.used / quota.limit >= 0.9
                    ? "bg-gradient-to-r from-red-500 to-rose-400"
                    : quota.used / quota.limit >= 0.7
                    ? "bg-gradient-to-r from-amber-500 to-orange-400"
                    : "bg-gradient-to-r from-indigo-500 to-violet-500"
                }`}
                style={{ width: `${Math.min(100, Math.round((quota.used / quota.limit) * 100))}%` }}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2">
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
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
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
        <div className="rounded-3xl border border-dashed border-indigo-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-3xl">
            📊
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            No projects yet
          </h2>
          <p className="mx-auto max-w-md text-gray-500">
            Create your first project to start tracking brand visibility in AI
            engines.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
          >
            Create first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, idx) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70"
            >
              <div className={`h-1.5 bg-gradient-to-r ${PROJECT_COLORS[idx % PROJECT_COLORS.length]}`} />
              <div className="p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
                    {p.name}
                  </h2>
                  <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-400">
                    {relativeTime(p.last_run)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-2xl font-bold text-gray-950">{p.brand_count}</div>
                    <div className="text-xs font-medium text-gray-400">Brands</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-2xl font-bold text-gray-950">{p.query_count}</div>
                    <div className="text-xs font-medium text-gray-400">Queries</div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs font-medium text-gray-400">
                  <span>Open project</span>
                  <span className="text-indigo-500 transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
