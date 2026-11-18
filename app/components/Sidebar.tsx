"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

interface QuotaData {
  used: number;
  limit: number;
  referral_code: string;
}

function BarChartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="3" y="10" width="3" height="7" rx="1" />
      <rect x="8.5" y="5" width="3" height="12" rx="1" />
      <rect x="14" y="8" width="3" height="9" rx="1" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4H8l1.5 2H15A2.5 2.5 0 0 1 17.5 8.5v5A2.5 2.5 0 0 1 15 16H5a3 3 0 0 1-3-3V6.5Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function NavItem({
  href,
  active,
  children,
  highlight,
  icon,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  highlight?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-indigo-50 font-medium text-indigo-700"
          : highlight
          ? "bg-gradient-to-r from-indigo-600 to-violet-600 font-medium text-white shadow-sm shadow-indigo-200 hover:shadow-md"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [quota, setQuota] = useState<QuotaData | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/user/quota")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setQuota(data); })
      .catch(() => {});
  }, [user]);

  const displayName = useMemo(() => {
    return user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Guest";
  }, [user]);

  const initial = displayName.charAt(0).toUpperCase();
  const quotaPct = quota && quota.limit > 0
    ? Math.min(100, Math.round((quota.used / quota.limit) * 100))
    : 0;
  const onProject = pathname.startsWith("/projects/");

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-white px-3 py-4">
      <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-sm shadow-indigo-200">
          A
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-gray-900">AEO Tracker</div>
          <div className="text-xs font-medium text-gray-400">AI Visibility</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-7">
        <section>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Projects
          </div>
          <div className="space-y-1">
            <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={<BarChartIcon />}>
              Overview
            </NavItem>
            {onProject && (
              <NavItem href="/dashboard" active={onProject} icon={<FolderIcon />}>
                Current Project
              </NavItem>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Workspace
          </div>
          <div className="space-y-1">
            <NavItem href="/dashboard" icon={<FolderIcon />}>
              All Projects
            </NavItem>
            <NavItem href="/dashboard" highlight icon={<PlusIcon />}>
              New Project
            </NavItem>
          </div>
        </section>
      </nav>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <div className="mb-3 flex items-center gap-2.5">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
              },
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">{displayName}</div>
            <div className="text-xs text-gray-400">Free plan</div>
          </div>
        </div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
          <span>Daily quota</span>
          <span>{quota ? `${quota.used}/${quota.limit}` : "..."}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${quotaPct}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
