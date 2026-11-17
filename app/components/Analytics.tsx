"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
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
  }, [pathname, session]);

  return null;
}

export function useTrack() {
  const { data: session } = useSession();

  return function trackEvent(event: string, category: string, properties: Record<string, unknown> = {}) {
    void session; // used for context
    const sid = getOrCreateSessionId();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "event", event, category, properties, sessionId: sid }),
    }).catch(() => {});
  };
}
