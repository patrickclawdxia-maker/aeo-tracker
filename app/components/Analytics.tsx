"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("_asid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_asid", sid);
  }
  return sid;
}

export function Analytics() {
  const pathname = usePathname();
  const { userId } = useAuth();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const sid = getOrCreateSessionId();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        path: pathname,
        referrer: document.referrer || null,
        sessionId: sid,
      }),
    }).catch(() => {});
  }, [pathname, userId]);

  return null;
}

export function useTrack() {
  return function trackEvent(event: string, category: string, properties: Record<string, unknown> = {}) {
    const sid = getOrCreateSessionId();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "event", event, category, properties, sessionId: sid }),
    }).catch(() => {});
  };
}
