"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface QuotaData {
  used: number;
  limit: number;
  referral_code: string;
}

export function NavBar() {
  const { data: session, status } = useSession();
  const [quota, setQuota] = useState<QuotaData | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/quota")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) setQuota(data);
        })
        .catch(() => {});
    }
  }, [session]);

  const displayName = session?.user?.name
    ? session.user.name.split(" ")[0]
    : session?.user?.email?.split("@")[0] ?? "";

  const quotaPct = quota ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-bold text-lg text-indigo-600 hover:text-indigo-700 transition-colors shrink-0"
        >
          🤖 AEO Tracker
        </Link>
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium shrink-0">
          AI Engine Optimization
        </span>

        <div className="flex-1" />

        {status === "loading" ? null : !session ? (
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
        ) : (
          <div className="flex items-center gap-4">
            {/* Quota display */}
            {quota && (
              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-xs text-gray-500">
                  {quota.used} / {quota.limit} queries today
                </span>
                <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quotaPct >= 90
                        ? "bg-red-500"
                        : quotaPct >= 70
                        ? "bg-amber-500"
                        : "bg-indigo-500"
                    }`}
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* User name */}
            <span className="text-sm text-gray-700 hidden sm:inline">
              {displayName}
            </span>

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
